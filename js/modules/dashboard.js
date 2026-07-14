// ============================================================
// NEUROSARATHI V3 — modules/dashboard.js
// Dashboard Orchestration — Phase 1 Final
//
// FIXES APPLIED IN THIS VERSION:
// 1. getCurrentUser() now resolves to the user object directly
//    (per core/auth.js's Auth.getUser()), not { data: { user } }.
//    Every call site below has been updated to match — this was a
//    live bug: the old destructuring pattern would throw a
//    TypeError on the very first line of init(), before anything
//    else ran.
// 2. NeuroSarathi.Notifications.setupSubscription() is now actually
//    called — it existed but nothing invoked it, so realtime
//    notification toasts never activated.
// 3. NeuroSarathi.Auth.setupSessionMonitoring() is now actually
//    called — same situation, defined but dormant.
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Dashboard = {
    initialized: false,

    init: async function() {
        if (this.initialized) return;

        try {
            // FIX: getCurrentUser() resolves directly to the user object now
            const user = await getCurrentUser();
            alert('DEBUG — user: ' + JSON.stringify(user) + ' | location: ' + window.location.href);
            if (!user) {
                // window.location.href = '/enterportal.html';
                alert('DEBUG — no user found, would redirect to enterportal.html now');
                return;
            }
            NeuroSarathi.State.set('user', user);

            const profile = await getProfile(user.id);
            NeuroSarathi.State.set('profile', profile);

            if (!profile.onboarding_completed) {
                NeuroSarathi.State.set('isFirstLogin', true);
                await this._showOnboarding();
                return;
            }
            NeuroSarathi.State.set('onboardingComplete', true);

            NeuroSarathi.UI.setupEventListeners();
            await this.loadChildContext();

            // Previously defined but never called:
            await NeuroSarathi.Notifications.setupSubscription();
            NeuroSarathi.Auth.setupSessionMonitoring();

            this.initialized = true;
            console.log('✅ NeuroSarathi Dashboard — Ready');

        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load dashboard. Please refresh.', 'error');
        }
    },

    /**
     * Continuation point — called after onboarding, after adding a
     * child, or when switching children. Does NOT re-run auth/profile
     * checks or re-attach event listeners (those only happen once, in
     * init()).
     */
    loadChildContext: async function() {
        try {
            await NeuroSarathi.Children.load();

            const children = NeuroSarathi.State.get('children');
            if (!children || children.length === 0) {
                await this._showFirstChildGuide();
                return;
            }

            await this.loadDashboard();
            NeuroSarathi.UI.renderAll();

            if (NeuroSarathi.State.get('isFirstLogin')) {
                NeuroSarathi.State.set('isFirstLogin', false);
                const child = NeuroSarathi.State.get('activeChild');
                if (child) {
                    NeuroSarathi.UI.Toasts.show(`🎉 Welcome! ${child.name}'s journey has begun.`, 'success');
                }
            }

        } catch (error) {
            console.error('Error loading child context:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load child data', 'error');
        }
    },

    loadDashboard: async function() {
        const childId = NeuroSarathi.State.get('activeChild.id');
        if (!childId) return;

        NeuroSarathi.State.setLoading('dashboard', true);
        NeuroSarathi.UI.Skeleton.show('feedContainer', 3, 'card');

        try {
            const summary = await NeuroSarathi.API.getDashboardSummary(childId);

            NeuroSarathi.State.update({
                'dashboard.stats': summary.stats,
                'dashboard.gamification': summary.gamification,
                'dashboard.routines': summary.routines,
                'dashboard.journal': summary.journal,
                'dashboard.learning': summary.learning || [],
                'dashboard.timeline': summary.timeline || [],
                'dashboard.badges': summary.badges || [],
                'dashboard.notifications': summary.notifications || []
            });

            // Feed.load() marks feedContainer as "real" internally —
            // see modules/feed.js. This is what makes the Skeleton.hide()
            // call in the finally block below safe (it becomes a no-op
            // once real content has taken over, instead of wiping it).
            await NeuroSarathi.Feed.load(true);

            NeuroSarathi.UI.renderAll();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load some data', 'warning');
        } finally {
            NeuroSarathi.State.setLoading('dashboard', false);
            NeuroSarathi.UI.Skeleton.hide('feedContainer');
        }
    },

    _showOnboarding: async function() {
        NeuroSarathi.UI.Modals.create({
            id: 'onboardingModal',
            size: 'modal-lg',
            header: '👋 Welcome to NeuroSarathi!',
            body: `
                <div style="text-align:center;padding:24px 0;">
                    <span style="font-size:64px;display:block;margin-bottom:16px;">🌟</span>
                    <h2 style="font-size:24px;font-weight:800;color:#0b1a33;margin-bottom:8px;">
                        Let's Personalize Your Journey
                    </h2>
                    <p style="color:#64748b;max-width:400px;margin:0 auto;">
                        We'll help you set up your child's learning profile. This will take about 3 minutes.
                    </p>
                    <button class="btn btn-primary" onclick="NeuroSarathi.Children.showAddModal({ onboarding: true })" style="margin-top:20px;">
                        Get Started →
                    </button>
                </div>
            `
        });
        NeuroSarathi.UI.Modals.show('onboardingModal');
    },

    _showFirstChildGuide: function() {
        NeuroSarathi.UI.Modals.create({
            id: 'firstChildGuide',
            size: 'modal-lg',
            header: '❤️ Let\'s Begin Your Journey',
            body: `
                <div style="text-align:center;padding:24px 0;">
                    <span style="font-size:72px;display:block;margin-bottom:16px;">👶</span>
                    <h2 style="font-size:24px;font-weight:800;color:#0b1a33;margin-bottom:8px;">
                        Welcome to NeuroSarathi!
                    </h2>
                    <p style="color:#64748b;max-width:400px;margin:0 auto 20px;">
                        Add your first child to start their learning journey.
                    </p>
                    <button class="btn btn-primary" onclick="NeuroSarathi.Children.showAddModal()" style="margin-top:8px;">
                        <i class="fas fa-plus"></i>
                        Add Your First Child
                    </button>
                </div>
            `
        });
        NeuroSarathi.UI.Modals.show('firstChildGuide');
    },

    refresh: function() {
        this.loadDashboard();
        NeuroSarathi.UI.Toasts.show('Dashboard refreshed 🔄', 'success');
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Dashboard module loaded');
