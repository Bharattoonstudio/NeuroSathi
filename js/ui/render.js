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
                    <button class="routine-toggle btn btn-ghost btn-sm"
                            onclick="NeuroSarathi.Routines?.toggle('${routine.id}')">
                        ${routine.completed ? '✅' : '☐'}
                    </button>
                `;

                if (routine.completed) completed++;
                container.appendChild(item);
            });

            const total = routines.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            if (progress) progress.textContent = `${completed}/${total}`;
            if (fill) fill.style.width = `${pct}%`;
        },

        _renderJournal: function(entries) {
            const container = document.getElementById('journalEntries');
            if (!container) return;

            if (!entries || entries.length === 0) {
                container.innerHTML = `
                    <div class="journal-empty">
                        <span class="journal-empty-icon">📝</span>
                        <p class="journal-empty-text">Start your journal. Record daily wins, challenges, and memories.</p>
                        <button class="btn btn-secondary btn-sm" onclick="NeuroSarathi.Journal?.showAdd()">
                            Write First Entry
                        </button>
                    </div>
                `;
                return;
            }

            const moodEmojis = ['😢', '😟', '😐', '😊', '😄'];
            container.innerHTML = entries.slice(0, 3).map(entry => `
                <div class="journal-entry fade-in">
                    <div class="journal-entry-header">
                        <span class="journal-entry-date">${formatDate(entry.created_at)}</span>
                        <span class="journal-entry-mood">${moodEmojis[entry.mood - 1] || '😊'}</span>
                    </div>
                    <div class="journal-entry-text">${entry.content}</div>
                </div>
            `).join('');
        },

        _renderGamification: function(gamification, stats, badges) {
            const xpEl = document.getElementById('gamificationXP');
            const streakEl = document.getElementById('gamificationStreak');
            const activitiesEl = document.getElementById('gamificationActivities');
            const observationsEl = document.getElementById('gamificationObservations');
            const articlesEl = document.getElementById('gamificationArticles');
            const badgesContainer = document.getElementById('gamificationBadges');

            const xp = gamification.xp || stats.xp || 0;

            if (xpEl) xpEl.textContent = `${xp} XP`;
            if (streakEl) streakEl.textContent = stats.streak || 0;
            if (activitiesEl) activitiesEl.textContent = stats.activities || 0;
            if (observationsEl) observationsEl.textContent = stats.observations || 0;
            if (articlesEl) articlesEl.textContent = stats.documents || 0;

            if (badgesContainer) {
                const allBadges = NeuroSarathi.Config?.BADGES || [];

                const earned = {};
                allBadges.forEach(b => {
                    let allMet = true;
                    for (const [key, val] of Object.entries(b.requirement)) {
                        if ((stats[key] || 0) < val) { allMet = false; break; }
                    }
                    earned[b.id] = allMet;
                });

                badgesContainer.innerHTML = allBadges.map(b => `
                    <div class="badge-slot ${earned[b.id] ? 'unlocked' : 'empty'}">
                        <span class="badge-icon">${b.icon}</span>
                        <span class="badge-label">${b.label}</span>
                    </div>
                `).join('');
            }
        },

        _renderFamilyTree: function(stats) {
            const branches = document.getElementById('treeBranches');
            const statsEl = document.getElementById('treeStats');
            const progress = document.getElementById('treeProgress');

            if (!branches) return;

            const leaves = Math.min(stats.activities || 0, 3);
            const flowers = Math.min(Math.floor((stats.activities || 0) / 3), 2);
            const stars = Math.min(Math.floor((stats.activities || 0) / 5), 1);

            const leafElements = branches.querySelectorAll('.tree-branch:first-child .tree-leaf');
            leafElements.forEach((el, i) => {
                el.textContent = i < leaves ? '🌿' : '🌱';
                el.className = `tree-leaf ${i < leaves ? '' : 'empty'}`;
            });

            const flowerElements = branches.querySelectorAll('.tree-branch:nth-child(2) .tree-flower');
            flowerElements.forEach((el, i) => {
                el.textContent = i < flowers ? '🌸' : '🌱';
                el.className = `tree-flower ${i < flowers ? '' : 'empty'}`;
            });

            const starElements = branches.querySelectorAll('.tree-branch:last-child .tree-star');
            starElements.forEach((el, i) => {
                el.textContent = i < stars ? '⭐' : '🌱';
                el.className = `tree-star ${i < stars ? '' : 'empty'}`;
            });

            if (statsEl) {
                statsEl.innerHTML = `
                    <span>🌿 ${stats.activities || 0} Activities</span>
                    <span>🌸 ${flowers} Milestones</span>
                    <span>⭐ ${stars} Courses</span>
                `;
            }

            if (progress) {
                const count = stats.activities || 0;
                if (count === 0) progress.textContent = 'Plant your first seed!';
                else if (count < 3) progress.textContent = 'Growing strong! 🌱';
                else if (count < 5) progress.textContent = 'Look at you grow! 🌿';
                else progress.textContent = 'Beautiful garden! 🌳';
            }
        },

        _renderTimeline: function(timeline) {
            const container = document.getElementById('timelineContainer');
            if (!container) return;

            if (!timeline || timeline.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:16px;">
                        <span class="empty-state-icon">📜</span>
                        <p>Your child's journey will appear here.</p>
                        <p style="font-size:12px;color:#94a3b8;">Complete activities and add observations to build the timeline.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = timeline.slice(0, 10).map(event => `
                <div class="timeline-event fade-in">
                    <div class="timeline-dot ${event.type === 'activity' ? 'activity' : 'observation'}"></div>
                    <div class="timeline-content">
                        <div class="timeline-title">${event.title}</div>
                        <div class="timeline-description">${event.description}</div>
                        <div class="timeline-date">${formatDate(event.date)}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    Feed: {
        render: function() {
            const container = document.getElementById('feedContainer');
            if (container && container.children.length === 0) {
                NeuroSarathi.Feed?.load(true);
            }
        },

        createCard: function(item) {
            const card = document.createElement('div');
            card.className = 'feed-card fade-in';

            const config = NeuroSarathi.Config?.FEED_TYPES || {};
            const typeInfo = config[item.type] || { icon: '📌', label: 'Update' };

            let content = '';
            let actions = '';

            switch (item.type) {
                case 'activity': {
                    const activity = item.data.activities;
                    const isCompleted = item.data.completed;
                    content = `
                        <div class="feed-card-title">${activity?.title || 'Learning Activity'}</div>
                        <div class="feed-card-description">${activity?.description || 'Complete today\'s activity'}</div>
                        <div class="feed-card-meta">
                            <span>⏱️ ${activity?.duration_minutes || '—'} min</span>
                            <span>⭐ ${activity?.difficulty || 'Medium'}</span>
                            <span>${isCompleted ? '✅ Completed' : '⏳ In Progress'}</span>
                        </div>
                    `;
                    actions = `
                        <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm"
                                onclick="NeuroSarathi.Activities?.start('${item.data.id}')">
                            ${isCompleted ? '🔄 Replay' : '▶️ Start'}
                        </button>
                    `;
                    break;
                }
                case 'observation': {
                    const moodEmojis = ['😢', '😟', '😐', '😊', '😄'];
                    const mood = item.data.mood_rating ? moodEmojis[item.data.mood_rating - 1] : '';
                    content = `
                        <div class="feed-card-title">📝 New Observation</div>
                        <div class="feed-card-description">${item.data.content || ''}</div>
                        <div class="feed-card-meta">
                            <span>${mood}</span>
                            <span>${formatDate(item.data.created_at)}</span>
                        </div>
                    `;
                    break;
                }
                default: {
                    content = `
                        <div class="feed-card-title">${item.data.title || 'Update'}</div>
                        <div class="feed-card-description">${item.data.description || 'New update available'}</div>
                    `;
                }
            }

            card.innerHTML = `
                <div class="feed-card-header">
                    <span class="feed-card-icon">${typeInfo.icon}</span>
                    <span class="feed-card-type">${typeInfo.label}</span>
                    <span class="feed-card-time">${formatDate(item.created_at)}</span>
                </div>
                ${content}
                ${actions ? `<div class="feed-card-actions">${actions}</div>` : ''}
            `;

            return card;
        },

        showLoader: function() {
            const loader = document.getElementById('feedLoader');
            if (loader) loader.classList.add('active');
        },

        hideLoader: function() {
            const loader = document.getElementById('feedLoader');
            if (loader) loader.classList.remove('active');
        },

        showEmpty: function() {
            const container = document.getElementById('feedContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📋</span>
                    <div class="empty-state-title">Your feed is empty</div>
                    <div class="empty-state-description">Start your journey by adding an observation or completing an activity.</div>
                    <button class="btn btn-primary btn-sm" onclick="NeuroSarathi.Observations?.showAdd()" style="margin-top:12px;">
                        <i class="fas fa-plus"></i>
                        Add Observation
                    </button>
                </div>
            `;
        }
    },

    setupEventListeners: function() {
        const hamburger = document.getElementById('hamburgerBtn');
        if (hamburger) hamburger.addEventListener('click', () => this.toggleSidebar());

        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.addEventListener('click', () => this.toggleSidebar());

        const childSelector = document.getElementById('childSelector');
        const childDropdown = document.getElementById('childDropdown');
        if (childSelector) {
            childSelector.addEventListener('click', function(e) {
                e.stopPropagation();
                if (childDropdown) childDropdown.classList.toggle('open');
            });
        }
        document.addEventListener('click', function(e) {
            if (childSelector && childDropdown &&
                !childSelector.contains(e.target) && !childDropdown.contains(e.target)) {
                childDropdown.classList.remove('open');
            }
        });

        const childAddBtn = document.getElementById('childAddBtn');
        if (childAddBtn) {
            childAddBtn.addEventListener('click', function() {
                if (childDropdown) childDropdown.classList.remove('open');
                NeuroSarathi.Children?.showAddModal?.();
            });
        }

        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                NeuroSarathi.UI.navigateTo(this.dataset.page);
            });
        });
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', function() {
                NeuroSarathi.UI.navigateTo(this.dataset.page);
            });
        });

        const heroContinue = document.getElementById('heroContinueBtn');
        if (heroContinue) heroContinue.addEventListener('click', () => this.navigateTo('activities'));
        const heroAsk = document.getElementById('heroAskBtn');
        if (heroAsk) heroAsk.addEventListener('click', NeuroSarathi.Chat?.toggle);
        const heroRoutine = document.getElementById('heroRoutineBtn');
        if (heroRoutine) {
            heroRoutine.addEventListener('click', () => {
                document.getElementById('routineSection')?.scrollIntoView({ behavior: 'smooth' });
            });
        }

        const aiPlan = document.getElementById('aiTodayPlan');
        if (aiPlan) aiPlan.addEventListener('click', () => this.navigateTo('activities'));
        const aiAsk = document.getElementById('aiAskMe');
        if (aiAsk) aiAsk.addEventListener('click', NeuroSarathi.Chat?.toggle);
        const aiIdeas = document.getElementById('aiActivityIdeas');
        if (aiIdeas) aiIdeas.addEventListener('click', () => this.navigateTo('activities'));

        const feedRefresh = document.getElementById('feedRefresh');
        if (feedRefresh) feedRefresh.addEventListener('click', () => NeuroSarathi.Feed?.refresh?.());

        const journalAdd = document.getElementById('journalAddBtn');
        if (journalAdd) journalAdd.addEventListener('click', NeuroSarathi.Journal?.showAdd);
        const journalEmpty = document.getElementById('journalEmptyAction');
        if (journalEmpty) journalEmpty.addEventListener('click', NeuroSarathi.Journal?.showAdd);

        const bell = document.getElementById('notificationBell');
        if (bell) bell.addEventListener('click', NeuroSarathi.Notifications?.toggle);
        const notifClose = document.getElementById('notificationClose');
        if (notifClose) notifClose.addEventListener('click', NeuroSarathi.Notifications?.toggle);
        const markAll = document.getElementById('markAllRead');
        if (markAll) markAll.addEventListener('click', NeuroSarathi.Notifications?.markAllRead);

        const avatar = document.getElementById('aiAvatarFloat');
        if (avatar) avatar.addEventListener('click', NeuroSarathi.Chat?.toggle);
        const chatClose = document.getElementById('chatClose');
        if (chatClose) chatClose.addEventListener('click', NeuroSarathi.Chat?.toggle);
        const chatSend = document.getElementById('chatSend');
        if (chatSend) chatSend.addEventListener('click', NeuroSarathi.Chat?.sendMessage);
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') NeuroSarathi.Chat?.sendMessage();
            });
        }

        document.querySelectorAll('.chat-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                const input = document.getElementById('chatInput');
                if (input) {
                    input.value = this.dataset.prompt;
                    NeuroSarathi.Chat?.sendMessage();
                }
            });
        });

        const logout = document.getElementById('logoutBtn');
        if (logout) {
            logout.addEventListener('click', function(e) {
                e.preventDefault();
                NeuroSarathi.Auth?.logout?.();
            });
        }

        const search = document.getElementById('globalSearch');
        const searchClear = document.getElementById('searchClear');
        let searchTimeout = null;

        if (search) {
            search.addEventListener('input', function() {
                const query = this.value.trim();
                if (searchClear) searchClear.style.display = query ? 'block' : 'none';
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        NeuroSarathi.Search?.perform?.(query);
                    } else {
                        NeuroSarathi.Feed?.load?.(true);
                    }
                }, 300);
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                if (search) {
                    NeuroSarathi.Search?.clear?.();
                }
            });
        }

        console.log('✅ Event listeners attached');
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Render module loaded');
