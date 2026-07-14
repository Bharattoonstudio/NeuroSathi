// ============================================================
// NEUROSARATHI V3 — ui/render.js
// SINGLE Rendering Engine — Merged
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.UI = {
    navigateTo: function(page) {
        const state = NeuroSarathi.State;
        state.set('currentPage', page);

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    },

    toggleSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    },

    renderAll: function() {
        this.Dashboard.render();
        this.Feed.render();
    },

    Dashboard: {
        render: function() {
            const state = NeuroSarathi.State.get();
            const child = state.activeChild;
            const stats = state.dashboard?.stats || {};
            const routines = state.dashboard?.routines || [];
            const journal = state.dashboard?.journal || [];
            const gamification = state.dashboard?.gamification || {};
            const badges = state.dashboard?.badges || [];
            const timeline = state.dashboard?.timeline || [];

            this._renderHero(child, stats);
            this._renderFirstStep(stats);
            this._renderAI(child, stats);
            this._renderRoutines(routines);
            this._renderJournal(journal);
            this._renderGamification(gamification, stats, badges);
            this._renderFamilyTree(stats);
            this._renderTimeline(timeline);
        },

        _renderHero: function(child, stats) {
            const greeting = document.getElementById('heroGreeting');
            const subtitle = document.getElementById('heroSubtitle');
            const count = document.getElementById('heroActivitiesCount');
            const profile = NeuroSarathi.State.get('profile');

            if (!greeting) return;

            if (!child) {
                greeting.textContent = 'Welcome to NeuroSarathi 👋';
                if (subtitle) subtitle.textContent = 'Add your first child to begin the journey.';
                if (count) count.textContent = '0 Activities Ready';
                return;
            }

            const firstName = profile?.full_name?.split(' ')[0] || 'Parent';
            const hour = new Date().getHours();
            const emoji = hour < 6 ? '🌙' : hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌅';
            const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

            greeting.textContent = `${emoji} ${timeGreeting}, ${firstName}`;
            if (subtitle) subtitle.textContent = `Today's focus: ${this._getFocusText(child)}`;
            if (count) count.textContent = `${stats.activities || 0} Activities Ready`;
        },

        _getFocusText: function(child) {
            const focus = child.learning_focus || [];
            const labels = NeuroSarathi.Config?.FOCUS_LABELS || {};
            if (focus.length === 0) return 'Learning';
            return focus.slice(0, 2).map(f => labels[f] || f).join(' & ');
        },

        _renderFirstStep: function(stats) {
            const card = document.getElementById('firstStepCard');
            const title = document.getElementById('firstStepTitle');
            const desc = document.getElementById('firstStepDesc');
            const action = document.getElementById('firstStepAction');

            if (!card) return;

            if (stats.observations === 0) {
                title.textContent = "Today's First Step";
                desc.textContent = 'Add your child\'s first observation. It only takes one minute.';
                action.textContent = 'Add Observation';
                action.onclick = () => NeuroSarathi.Observations?.showAdd?.() || NeuroSarathi.UI.Toasts.show('Observations module loading...', 'info');
                card.style.display = 'block';
            } else if (stats.activities === 0) {
                title.textContent = "Next Step: Start Learning";
                desc.textContent = 'Complete your first activity with your child today.';
                action.textContent = 'Start Activity';
                action.onclick = () => NeuroSarathi.UI.navigateTo('activities');
                card.style.display = 'block';
            } else if (stats.documents === 0) {
                title.textContent = "Next Step: Upload Documents";
                desc.textContent = 'Upload a school report or assessment to track progress.';
                action.textContent = 'Upload Document';
                action.onclick = () => NeuroSarathi.UI.navigateTo('documents');
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        },

        _renderAI: function(child, stats) {
            const greeting = document.getElementById('aiGreeting');
            const message = document.getElementById('aiMessage');

            if (!greeting || !message) return;

            if (!child) {
                greeting.textContent = 'Hello! I\'m AI Sarathi 🤖';
                message.textContent = 'Add your first child to start your journey.';
                return;
            }

            const name = child.name;

            if (stats.activities === 0 && stats.observations === 0) {
                greeting.textContent = 'Welcome to NeuroSarathi! 🌟';
                message.textContent = `I'm here to help you support ${name}'s learning journey. Let's start with a simple observation.`;
            } else if (stats.activities < 3) {
                greeting.textContent = 'Great start! 🌱';
                message.textContent = `You've completed ${stats.activities} activities. Would you like to try another one?`;
            } else {
                greeting.textContent = 'Amazing progress! 🌟';
                message.textContent = `You've completed ${stats.activities} activities this week. Keep up the great work with ${name}!`;
            }
        },

        _renderRoutines: function(routines) {
            const container = document.getElementById('routineTimeline');
            const progress = document.getElementById('routineProgress');
            const fill = document.querySelector('.routine-progress-fill');

            if (!container) return;

            if (!routines || routines.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:16px;">
                        <span class="empty-state-icon">📋</span>
                        <p>No routines set up yet.</p>
                        <button class="btn btn-primary btn-sm" onclick="NeuroSarathi.Routines.createDefault()" style="margin-top:8px;">
                            Create Default Routine
                        </button>
                    </div>
                `;
                return;
            }

            let completed = 0;
            container.innerHTML = '';

            routines.forEach(routine => {
                const item = document.createElement('div');
                item.className = `routine-item ${routine.completed ? 'completed' : ''}`;
                item.dataset.id = routine.id;

                item.innerHTML = `
                    <div class="routine-dot"></div>
                    <div class="routine-content">
                        <span class="routine-time">${routine.time}</span>
                        <span class="routine-label">${routine.name}</span>
                    </div>
                    
