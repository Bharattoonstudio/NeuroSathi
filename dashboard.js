// ============================================================
// NEUROSARATHI V2 — dashboard.js
// Main Dashboard Controller
//
// NOTE ON THIS REVISION: this file previously duplicated several
// functions that also exist in child.js, feed.js, sarathi.js, and
// notification.js (loadChildren, renderChildSelector, updateHeroInfo,
// switchChild, toggleChildDropdown + its outside-click listener,
// loadFeed, getFeedItems, createFeedCard, toggleChat, sendChatMessage,
// addChatMessage, addTypingIndicator/removeTypingIndicator,
// toggleNotifications, loadNotifications, renderNotifications,
// handleNotificationClick, and a recursive markAllNotificationsRead).
// Because dashboard.html loads dashboard.js BEFORE those module files,
// the later files were silently overwriting these on every page load —
// so these duplicates were dead code, just wasted bytes and a source of
// confusion. They've been removed here; the module files are now the
// single source of truth for that behavior.
//
// Two real (not just theoretical) bugs found while removing duplicates:
//  1. handlePhotoUpload(e) here took an Event, but child.js's
//     handlePhotoUpload(inputId, previewId) takes two strings — same
//     global name, incompatible signatures. Since child.js loads after
//     this file, its version would have silently won, and this file's
//     own photo-upload wiring would have broken (passed an Event where
//     two ID strings were expected). Renamed this file's version to
//     handleAddChildPhotoUpload to remove the collision.
//  2. markAllNotificationsRead() here called
//     window.markAllNotificationsRead(state.user.id) — i.e. itself —
//     which would have recursed until a stack overflow the first time
//     it ran, had it not already been silently overwritten by
//     notification.js's non-recursive version. Removed entirely.
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const state = {
    user: null,
    profile: null,
    children: [],
    activeChild: null,
    currentPage: 'home',
    isLoading: false,
};

// ─── DOM REFERENCES ──────────────────────────────────────────

const DOM = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    mainContent: document.getElementById('mainContent'),
    pageContainer: document.getElementById('pageContainer'),

    // Hero
    heroGreeting: document.getElementById('heroGreeting'),
    heroSubtitle: document.getElementById('heroSubtitle'),
    heroChildName: document.getElementById('heroChildName'),
    heroChildAge: document.getElementById('heroChildAge'),
    heroChildClass: document.getElementById('heroChildClass'),
    heroChildFocus: document.getElementById('heroChildFocus'),
    heroAiMessage: document.getElementById('heroAiMessage'),

    // Child Selector
    childSelector: document.getElementById('childSelector'),
    childDropdown: document.getElementById('childDropdown'),
    childDropdownList: document.getElementById('childDropdownList'),
    childAvatar: document.getElementById('childAvatar'),
    childName: document.getElementById('childName'),
    childAge: document.getElementById('childAge'),

    // Stats
    statPlanned: document.getElementById('statPlanned'),
    statCompleted: document.getElementById('statCompleted'),
    statRemaining: document.getElementById('statRemaining'),
    statStreak: document.getElementById('statStreak'),

    // Feed
    feedContainer: document.getElementById('feedContainer'),
    feedLoader: document.getElementById('feedLoader'),
    feedRefresh: document.getElementById('feedRefresh'),

    // Chat
    chatWindow: document.getElementById('chatWindow'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSend: document.getElementById('chatSend'),
    chatClose: document.getElementById('chatClose'),
    chatSuggestions: document.getElementById('chatSuggestions'),

    // Notifications
    notificationBell: document.getElementById('notificationBell'),
    notificationPanel: document.getElementById('notificationPanel'),
    notificationList: document.getElementById('notificationList'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationClose: document.getElementById('notificationClose'),
    markAllRead: document.getElementById('markAllRead'),

    // AI Avatar
    aiAvatarFloat: document.getElementById('aiAvatarFloat'),

    // Modals
    addChildModal: document.getElementById('addChildModal'),
    addChildForm: document.getElementById('addChildForm'),
    saveChildBtn: document.getElementById('saveChildBtn'),
    photoUpload: document.getElementById('photoUpload'),
    photoInput: document.getElementById('photoInput'),

    // Buttons
    logoutBtn: document.getElementById('logoutBtn'),
    todayPlanBtn: document.getElementById('todayPlanBtn'),
    continueLearningBtn: document.getElementById('continueLearningBtn'),
    askSarathiBtn: document.getElementById('askSarathiBtn'),
    aiTodayPlan: document.getElementById('aiTodayPlan'),
    aiChatOpen: document.getElementById('aiChatOpen'),
    childAddBtn: document.getElementById('childAddBtn'),
};

// ─── INITIALIZATION ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🧠 NeuroSarathi V2 — Initializing...');

    try {
        // Check authentication
        const { data: { user } } = await getCurrentUser();
        if (!user) {
            window.location.href = '/login';
            return;
        }
        state.user = user;

        // Load profile
        const profile = await getProfile(user.id);
        state.profile = profile;

        // Check onboarding
        if (!profile.onboarding_completed) {
            window.location.href = '/onboarding/welcome';
            return;
        }

        // Load children (child.js)
        await loadChildren();

        // Setup event listeners
        setupEventListeners();

        // Load initial dashboard data (stats + feed + notifications)
        if (state.activeChild) {
            await loadDashboardData();
        }

        // Feed infinite scroll (feed.js) — replaces this file's old manual
        // scroll listener, which duplicated the same responsibility.
        if (typeof setupInfiniteScroll === 'function') {
            setupInfiniteScroll();
        }

        // Realtime notification subscription (notification.js) — this was
        // defined in the original files but never actually called anywhere,
        // so live notifications never activated. Now it does.
        if (typeof setupNotificationSubscription === 'function') {
            await setupNotificationSubscription();
        }

        // Activity bookmarks (activities.js) — used by the Activities page
        // once it's built out; harmless no-op today since #activitiesContainer
        // doesn't exist in dashboard.html yet.
        if (typeof loadBookmarks === 'function') {
            await loadBookmarks();
        }

        // Dashboard-specific realtime channels (observations, child_activities).
        // The notifications channel that used to live here was a duplicate of
        // notification.js's own channel — removed in favor of that one.
        setupRealtimeSubscriptions();

        console.log('✅ NeuroSarathi V2 — Ready');

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to load dashboard. Please refresh.', 'error');
    }
});

// ─── UPDATE PAGE TITLE ──────────────────────────────────────

function updatePageTitle() {
    if (state.activeChild) {
        document.title = `NeuroSarathi — ${state.activeChild.name}`;
    }
}

// ─── LOAD DASHBOARD DATA ────────────────────────────────────

async function loadDashboardData() {
    if (!state.activeChild) return;

    showSkeleton('feedContainer', 3, 'card');

    try {
        await Promise.all([
            loadStats(),
            loadFeed(),        // feed.js
            loadNotifications() // notification.js
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    } finally {
        hideSkeleton('feedContainer');
    }
}

// ─── LOAD STATS ─────────────────────────────────────────────

async function loadStats() {
    const childId = state.activeChild.id;

    try {
        const today = new Date().toISOString().split('T')[0];

        // Get total activities
        const { count: total } = await supabase
            .from('child_activities')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId);

        // Get completed today
        const { count: completed } = await supabase
            .from('child_activities')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId)
            .eq('completed', true)
            .gte('completed_at', today);

        // Get streak
        let streak = 0;
        const { data: activities } = await supabase
            .from('child_activities')
            .select('completed_at')
            .eq('child_id', childId)
            .eq('completed', true)
            .order('completed_at', { ascending: false });

        if (activities) {
            const dates = activities.map(a => a.completed_at?.split('T')[0]).filter(Boolean);
            const uniqueDates = [...new Set(dates)];
            const todayStr = new Date().toISOString().split('T')[0];

            for (let i = 0; i < uniqueDates.length; i++) {
                const date = new Date(todayStr);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                if (uniqueDates.includes(dateStr)) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Update DOM
        animateCounter(DOM.statPlanned, total || 0);
        animateCounter(DOM.statCompleted, completed || 0);
        animateCounter(DOM.statRemaining, (total || 0) - (completed || 0));
        animateCounter(DOM.statStreak, streak);

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ─── ANIMATE COUNTER ────────────────────────────────────────

function animateCounter(element, target) {
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        element.textContent = current;
    }, 30);
}

// ─── SETUP EVENT LISTENERS ──────────────────────────────────

function setupEventListeners() {
    // Sidebar
    DOM.hamburgerBtn.addEventListener('click', toggleSidebar);
    DOM.sidebarOverlay.addEventListener('click', toggleSidebar);

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateTo(page);
        });
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', function () {
            const page = this.dataset.page;
            navigateTo(page);
        });
    });

    // Child selector (toggleChildDropdown provided by child.js; its own
    // outside-click-to-close listener is also registered there — no need
    // to duplicate it here)
    DOM.childSelector.addEventListener('click', toggleChildDropdown);

    // Chat (toggleChat / sendChatMessage provided by sarathi.js)
    DOM.aiAvatarFloat.addEventListener('click', toggleChat);
    DOM.chatClose.addEventListener('click', toggleChat);
    DOM.chatSend.addEventListener('click', sendChatMessage);
    DOM.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Chat chips
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            DOM.chatInput.value = this.dataset.prompt;
            sendChatMessage();
        });
    });

    // AI card chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            if (!DOM.chatWindow.classList.contains('open')) {
                toggleChat();
            }
            DOM.chatInput.value = this.dataset.prompt;
            sendChatMessage();
        });
    });

    // Notifications (toggleNotifications / markAllNotificationsRead
    // provided by notification.js)
    DOM.notificationBell.addEventListener('click', toggleNotifications);
    DOM.notificationClose.addEventListener('click', toggleNotifications);
    DOM.markAllRead.addEventListener('click', markAllNotificationsRead);

    // Logout
    DOM.logoutBtn.addEventListener('click', handleLogout);

    // Add child (showAddChildModal provided by child.js — also resets the
    // form/photo preview, which a bare showModal() call would not do)
    DOM.childAddBtn.addEventListener('click', () => {
        DOM.childDropdown.classList.remove('open');
        if (typeof showAddChildModal === 'function') {
            showAddChildModal();
        } else {
            showModal('addChildModal');
        }
    });

    // Photo upload for the Add Child modal specifically (renamed to avoid
    // colliding with child.js's generic handlePhotoUpload(inputId, previewId))
    DOM.photoUpload.addEventListener('click', () => DOM.photoInput.click());
    DOM.photoInput.addEventListener('change', handleAddChildPhotoUpload);

    // Save child (handleAddChildSubmit provided by child.js — it also
    // performs the create + state update via addChild(), so wiring the
    // button here to this file's own duplicate logic would have created
    // two independent code paths doing the same job)
    DOM.saveChildBtn.addEventListener('click', function (e) {
        handleAddChildSubmit(e);
    });

    // Quick action buttons
    DOM.todayPlanBtn.addEventListener('click', () => navigateTo('routine'));
    DOM.continueLearningBtn.addEventListener('click', () => navigateTo('learning'));
    DOM.askSarathiBtn.addEventListener('click', toggleChat);
    DOM.aiTodayPlan.addEventListener('click', () => navigateTo('routine'));
    DOM.aiChatOpen.addEventListener('click', toggleChat);

    // Feed refresh (loadFeed provided by feed.js)
    DOM.feedRefresh.addEventListener('click', () => loadFeed(true));
}

// ─── NAVIGATE TO PAGE ───────────────────────────────────────

function navigateTo(page) {
    // Update active state
    state.currentPage = page;

    // Update sidebar
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update bottom nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Show page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// ─── TOGGLE SIDEBAR ─────────────────────────────────────────

function toggleSidebar() {
    DOM.sidebar.classList.toggle('open');
    DOM.sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = DOM.sidebar.classList.contains('open') ? 'hidden' : '';
}

// ─── HANDLE LOGOUT ──────────────────────────────────────────

async function handleLogout(e) {
    e.preventDefault();
    try {
        await signOut();
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// ─── HANDLE ADD-CHILD PHOTO UPLOAD (preview only) ───────────
// Renamed from handlePhotoUpload to avoid colliding with child.js's
// generic handlePhotoUpload(inputId, previewId) — see file header note.

function handleAddChildPhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const preview = DOM.photoUpload.querySelector('.photo-preview');
        preview.innerHTML = `<img src="${event.target.result}" alt="Child photo" />`;
        preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// ─── SHOW EMPTY STATE ───────────────────────────────────────
// Called by child.js's deleteChildProfile() when the last child is removed.

function showEmptyState() {
    DOM.feedContainer.innerHTML = `
        <div class="empty-state">
            <span class="empty-state-icon">🌟</span>
            <div class="empty-state-title">Let's Begin Your Journey</div>
            <div class="empty-state-description">Add your first child to start their learning journey.</div>
            <button class="btn btn-primary" onclick="showAddChildModal()">
                <i class="fas fa-plus"></i>
                Add Your First Child
            </button>
            <p style="margin-top: 12px; font-size: 12px; color: #94a3b8;">✨ Every child can shine ✨</p>
        </div>
    `;
}

// ─── SETUP DASHBOARD-SPECIFIC REALTIME SUBSCRIPTIONS ───────
// The `notifications` channel that used to live here has been removed —
// it duplicated notification.js's own `setupNotificationSubscription()`
// channel (both listened for INSERT on the same table/filter and both
// called loadNotifications()/re-rendered on receipt). observations and
// child_activities channels are unique to the dashboard and stay here.

function setupRealtimeSubscriptions() {
    if (!state.activeChild) return;

    // Subscribe to observations
    supabase
        .channel('observations')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'observations',
            filter: `child_id=eq.${state.activeChild.id}`
        }, () => {
            loadFeed(true);
        })
        .subscribe();

    // Subscribe to child activities
    supabase
        .channel('child_activities')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'child_activities',
            filter: `child_id=eq.${state.activeChild.id}`
        }, () => {
            loadStats();
        })
        .subscribe();
}

// ─── GLOBAL FUNCTIONS (Exposed to HTML) ────────────────────

window.navigateTo = navigateTo;
window.showEmptyState = showEmptyState;

console.log('🧠 NeuroSarathi V2 — Dashboard Controller Loaded');
