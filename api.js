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
        const next = levels.find(l => l.level === level + 1);
        return next ? next.xp_required : 2000;
    },

    _calculateBadges: function(stats) {
        const config = [
            { id: 'first_activity', icon: '🌟', label: 'First Activity', requirement: { activities: 1 } },
            { id: 'first_observation', icon: '📝', label: 'First Observation', requirement: { observations: 1 } },
            { id: 'first_document', icon: '📚', label: 'First Read', requirement: { documents: 1 } },
            { id: 'streak_3', icon: '🔥', label: '3 Day Streak', requirement: { streak: 3 } },
            { id: 'streak_7', icon: '🔥🔥', label: '7 Day Streak', requirement: { streak: 7 } },
            { id: 'activity_master', icon: '🎯', label: 'Activity Master', requirement: { activities: 10 } },
            { id: 'observer', icon: '👁️', label: 'Observer', requirement: { observations: 5 } }
        ];
        const earned = [];
        for (const badge of config) {
            let allMet = true;
            for (const [key, value] of Object.entries(badge.requirement)) {
                if ((stats[key] || 0) < value) { allMet = false; break; }
            }
            if (allMet) earned.push(badge);
        }
        return earned;
    },

    _buildTimeline: async function(childId) {
        const events = [];

        const { data: observations } = await supabase
            .from('observations')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (observations) {
            observations.forEach(obs => {
                events.push({
                    type: 'observation', id: obs.id, title: '📝 Observation',
                    description: obs.content, date: obs.created_at, data: obs
                });
            });
        }

        const { data: activities } = await supabase
            .from('child_activities')
            .select('*, activities(*)')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (activities) {
            activities.forEach(act => {
                events.push({
                    type: 'activity', id: act.id,
                    title: act.activities?.title || '🎯 Activity',
                    description: act.completed ? '✅ Completed' : '⏳ In Progress',
                    date: act.created_at, data: act
                });
            });
        }

        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        return events.slice(0, 50);
    },

    getFeed: async function(childId, offset = 0, limit = 10) {
        try {
            const { data, error } = await supabase.rpc('get_dashboard_feed', {
                p_child_id: childId, p_offset: offset, p_limit: limit
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.warn('Feed RPC failed, using fallback:', error.message);
            return await this._fallbackFeed(childId, offset, limit);
        }
    },

    _fallbackFeed: async function(childId, offset, limit) {
        const items = [];
        try {
            const { data: activities } = await supabase
                .from('child_activities')
                .select('*, activities(*)')
                .eq('child_id', childId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (activities) {
                activities.forEach(act => {
                    items.push({ type: 'activity', id: act.id, data: act, created_at: act.created_at });
                });
            }

            const { data: observations } = await supabase
                .from('observations')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false })
                .range(offset, offset + Math.floor(limit / 2) - 1);

            if (observations) {
                observations.forEach(obs => {
                    items.push({ type: 'observation', id: obs.id, data: obs, created_at: obs.created_at });
                });
            }

            items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return items.slice(0, limit);

        } catch (error) {
            console.error('Feed fallback error:', error);
            return [];
        }
    },

    saveObservation: async function(observationData) {
        try {
            const { data, error } = await supabase.rpc('save_observation_with_xp', {
                p_child_id: observationData.child_id,
                p_parent_id: observationData.parent_id,
                p_content: observationData.content,
                p_mood_rating: observationData.mood_rating || null,
                p_activity_type: observationData.activity_type || null,
                p_category: observationData.category || 'general'
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.warn('Observation RPC failed:', error.message);
            const { data, error: insertError } = await supabase
                .from('observations')
                .insert({
                    child_id: observationData.child_id,
                    parent_id: observationData.parent_id,
                    content: observationData.content,
                    mood_rating: observationData.mood_rating || null,
                    activity_type: observationData.activity_type || null,
                    category: observationData.category || 'general'
                })
                .select()
                .single();
            if (insertError) throw insertError;
            return data;
        }
    },

    saveJournalEntry: async function(journalData) {
        try {
            const { data, error } = await supabase.rpc('save_journal_with_xp', {
                p_child_id: journalData.child_id,
                p_parent_id: journalData.parent_id,
                p_content: journalData.content,
                p_mood: journalData.mood || 3,
                p_win: journalData.win || null
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.warn('Journal RPC failed:', error.message);
            const { data, error: insertError } = await supabase
                .from('journal_entries')
                .insert({
                    child_id: journalData.child_id,
                    parent_id: journalData.parent_id,
                    content: journalData.content,
                    mood: journalData.mood || 3,
                    win: journalData.win || null
                })
                .select()
                .single();
            if (insertError) throw insertError;
            return data;
        }
    },

    toggleRoutine: async function(routineId, completed) {
        try {
            const { data, error } = await supabase.rpc('toggle_routine_with_xp', {
                p_routine_id: routineId, p_completed: completed
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.warn('Routine RPC failed:', error.message);
            const { data, error: updateError } = await supabase
                .from('routines')
                .update({
                    completed: completed,
                    completed_at: completed ? new Date().toISOString() : null
                })
                .eq('id', routineId)
                .select()
                .single();
            if (updateError) throw updateError;
            return data;
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ API module loaded');
