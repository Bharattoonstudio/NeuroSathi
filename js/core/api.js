// ============================================================
// NEUROSARATHI V3 — core/api.js
// Canonical Shape for RPC + Fallback
// FIX APPLIED: CANONICAL_EMPTY_DASHBOARD was being shallow-cloned
// via { ...CANONICAL_EMPTY_DASHBOARD }, which only copies top-level
// keys — nested objects like .stats and .gamification remained
// shared references. Mutating results.stats.activities = X was
// silently mutating the shared template itself, so a later call
// (or the catch-all error path) could return another child's
// leftover stats instead of true zeros. Fixed with a deep clone.
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

const CANONICAL_EMPTY_DASHBOARD = {
    stats: {
        activities: 0, observations: 0, documents: 0, streak: 0,
        xp: 0, completedToday: 0, level: 1, nextLevelXp: 100
    },
    gamification: { xp: 0, badges: [], level: 1, nextLevelXp: 100 },
    routines: [],
    journal: [],
    learning: [],
    timeline: [],
    badges: [],
    notifications: []
};

function cloneCanonicalEmpty() {
    return JSON.parse(JSON.stringify(CANONICAL_EMPTY_DASHBOARD));
}

NeuroSarathi.API = {
    getDashboardSummary: async function(childId) {
        try {
            const { data, error } = await supabase.rpc('get_dashboard_summary', { p_child_id: childId });
            if (error) throw error;
            return this._toCanonicalShape(data);
        } catch (error) {
            console.warn('RPC failed, using fallback:', error.message);
            return await this._fallbackDashboardSummary(childId);
        }
    },

    _toCanonicalShape: function(data) {
        if (!data) return cloneCanonicalEmpty();

        if (data.stats && data.gamification) {
            const empty = cloneCanonicalEmpty();
            return {
                stats: { ...empty.stats, ...data.stats },
                gamification: { ...empty.gamification, ...data.gamification },
                routines: data.routines || [],
                journal: data.journal || [],
                learning: data.learning || [],
                timeline: data.timeline || [],
                badges: data.badges || [],
                notifications: data.notifications || []
            };
        }

        return {
            stats: {
                activities: data.activities || 0,
                observations: data.observations || 0,
                documents: data.documents || 0,
                streak: data.streak || 0,
                xp: data.xp || 0,
                completedToday: data.completedToday || 0,
                level: data.level || this._calculateLevel(data.xp || 0),
                nextLevelXp: data.nextLevelXp || this._getNextLevelXp(data.level || 1)
            },
            gamification: {
                xp: data.xp || 0,
                badges: data.badges || [],
                level: data.level || this._calculateLevel(data.xp || 0),
                nextLevelXp: data.nextLevelXp || this._getNextLevelXp(data.level || 1)
            },
            routines: data.routines || [],
            journal: data.journal || [],
            learning: data.learning || [],
            timeline: data.timeline || [],
            badges: data.badges || [],
            notifications: data.notifications || []
        };
    },

    _fallbackDashboardSummary: async function(childId) {
        // FIX: deep clone, not shallow spread — see file header note
        const results = cloneCanonicalEmpty();

        try {
            const { count: activities } = await supabase
                .from('child_activities')
                .select('*', { count: 'exact', head: true })
                .eq('child_id', childId);
            results.stats.activities = activities || 0;

            const { count: observations } = await supabase
                .from('observations')
                .select('*', { count: 'exact', head: true })
                .eq('child_id', childId);
            results.stats.observations = observations || 0;

            const { count: documents } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('child_id', childId);
            results.stats.documents = documents || 0;

            const { data: completed } = await supabase
                .from('child_activities')
                .select('completed_at')
                .eq('child_id', childId)
                .eq('completed', true)
                .order('completed_at', { ascending: false });

            let streak = 0;
            if (completed && completed.length > 0) {
                const dates = completed.map(a => a.completed_at?.split('T')[0]).filter(Boolean);
                const uniqueDates = [...new Set(dates)];
                const today = new Date().toISOString().split('T')[0];
                for (let i = 0; i < uniqueDates.length; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    if (uniqueDates.includes(dateStr)) streak++;
                    else break;
                }
            }
            results.stats.streak = streak;

            const xp = (results.stats.activities * 10) + (results.stats.observations * 5) + (results.stats.documents * 3);
            results.stats.xp = xp;
            results.gamification.xp = xp;

            const level = this._calculateLevel(xp);
            results.stats.level = level;
            results.gamification.level = level;
            results.gamification.nextLevelXp = this._getNextLevelXp(level);

            const { data: routines } = await supabase
                .from('routines')
                .select('*')
                .eq('child_id', childId)
                .order('order_index', { ascending: true });
            results.routines = routines || [];

            const { data: journal } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false })
                .limit(3);
            results.journal = journal || [];

            results.timeline = await this._buildTimeline(childId);

            results.badges = this._calculateBadges(results.stats);
            results.gamification.badges = results.badges;

            const userId = NeuroSarathi.State.get('user.id');
            if (userId) {
                const { data: notifications } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(5);
                results.notifications = notifications || [];
            }

            return results;

        } catch (error) {
            console.error('Fallback error:', error);
            // FIX: fresh clone here too, not the (potentially already
            // mutated in a previous call) shared template
            return cloneCanonicalEmpty();
        }
    },

    _calculateLevel: function(xp) {
        const levels = [
            { level: 1, xp_required: 0 }, { level: 2, xp_required: 100 },
            { level: 3, xp_required: 250 }, { level: 4, xp_required: 500 },
            { level: 5, xp_required: 1000 }, { level: 6, xp_required: 2000 },
            { level: 7, xp_required: 3500 }, { level: 8, xp_required: 5000 },
            { level: 9, xp_required: 7500 }, { level: 10, xp_required: 10000 }
        ];
        let currentLevel = 1;
        for (const lvl of levels) if (xp >= lvl.xp_required) currentLevel = lvl.level;
        return currentLevel;
    },

    _getNextLevelXp: function(level) {
        const levels = [
            { level: 1, xp_required: 0 }, { level: 2, xp_required: 100 },
            { level: 3, xp_required: 250 }, { level: 4, xp_required: 500 },
            { level: 5, xp_required: 1000 }, { level: 6, xp_required: 2000 },
            { level: 7, xp_required: 3500 }, { level: 8, xp_required: 5000 },
            { level: 9, xp_required: 7500 }, { level: 10, xp_required: 10000 }
        ];
        const next = levels.find(lvl => lvl.level === level + 1);
        if (next) return next.xp_required;
        // Already at (or above) the max defined level — return the top requirement.
        return levels[levels.length - 1].xp_required;
    },

    _buildTimeline: async function(childId) {
        // Merges recent activities and observations into a single
        // chronological feed for the dashboard timeline widget.
        const timeline = [];

        try {
            const { data: activities } = await supabase
                .from('child_activities')
                .select('*')
                .eq('child_id', childId)
                .eq('completed', true)
                .order('completed_at', { ascending: false })
                .limit(10);

            (activities || []).forEach(a => {
                timeline.push({
                    type: 'activity',
                    title: a.title || a.activity_name || 'Activity completed',
                    description: a.description || 'Marked as complete',
                    date: a.completed_at
                });
            });

            const { data: observations } = await supabase
                .from('observations')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false })
                .limit(10);

            (observations || []).forEach(o => {
                timeline.push({
                    type: 'observation',
                    title: 'Observation logged',
                    description: o.note || o.content || '',
                    date: o.created_at
                });
            });

            timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
            return timeline.slice(0, 10);

        } catch (error) {
            console.error('Timeline build error:', error);
            return [];
        }
    },

    _calculateBadges: function(stats) {
        const badgeDefs = (window.NeuroSarathi.Config && window.NeuroSarathi.Config.BADGES) || [];
        return badgeDefs.filter(badge => {
            const req = badge.requirement || {};
            return Object.keys(req).every(key => (stats[key] || 0) >= req[key]);
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ API module loaded');

