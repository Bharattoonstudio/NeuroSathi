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
            // FIX (v3): iOS Safari/WebKit has a known timing bug where the
            // Supabase client hasn't finished reading the persisted session
            // from localStorage at the exact moment the page loads — so a
            // single getSession() call right away can return null even though
            // the token is physically present in storage. (Confirmed: the
            // sb-...-auth-token key exists with full data, but getSession()
            // returned null on iOS.) The fix is to wait for the client to
            // initialize and retry a few times before giving up.
            const session = await this._getSessionWithRetry();

            if (!session || !session.user) {
                // Genuinely no session after retries — send to login.
                window.location.href = '/enterportal.html';
                return;
            }
            const user = session.user;
            NeuroSarathi.State.set('user', user);

            let profile;
            try {
                profile = await getProfile(user.id);
            } catch (e) {
                alert('DIAG — getProfile FAILED: ' + e.message);
                throw e;
            }
            NeuroSarathi.State.set('profile', profile);

            if (!profile.onboarding_completed) {
                alert('DIAG — profile OK but onboarding_completed is FALSE/null. Showing onboarding modal. Value=' + JSON.stringify(profile.onboarding_completed));
                NeuroSarathi.State.set('isFirstLogin', true);
                await this._showOnboarding();
                return;
            }
            NeuroSarathi.State.set('onboardingComplete', true);

            NeuroSarathi.UI.setupEventListeners();

            try {
                await this.loadChildContext();
                alert('DIAG — loadChildContext finished OK');
            } catch (e) {
                alert('DIAG — loadChildContext FAILED: ' + e.message);
                throw e;
            }

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
     * iOS WebKit workaround: the Supabase auth client reads the persisted
     * session from storage asynchronously during startup. Calling getSession()
     * too early returns null even when a valid token is in localStorage.
     * This waits for onAuthStateChange to fire (which happens once the client
     * has hydrated), and also retries getSession() a few times as a fallback.
     */
    _getSessionWithRetry: async function() {
        // First: a quick direct check — often it's already ready.
        let session = await NeuroSarathi.Auth.getSession();
        if (session && session.user) return session;

        // If not, wait for the client to emit its initial auth state, with a
        // hard timeout so we never hang forever.
        session = await new Promise((resolve) => {
            let settled = false;
            const finish = (s) => {
                if (settled) return;
                settled = true;
                try { sub && sub.data && sub.data.subscription && sub.data.subscription.unsubscribe(); } catch (e) {}
                resolve(s);
            };

            const sub = supabase.auth.onAuthStateChange((_event, s) => {
                if (s && s.user) finish(s);
            });

            // Fallback: poll getSession() a few times over ~2 seconds.
            let attempts = 0;
            const poll = async () => {
                attempts++;
                const s = await NeuroSarathi.Auth.getSession();
                if (s && s.user) { finish(s); return; }
                if (attempts >= 8) { finish(null); return; }
                setTimeout(poll, 250);
            };
            setTimeout(poll, 250);
        });

        return session;
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
