// ============================================================
// NEUROSARATHI V2 — activities.js
// Activities Module
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const activitiesState = {
    currentFilter: 'all',
    currentDifficulty: 'all',
    searchQuery: '',
    page: 0,
    hasMore: true,
    isLoading: false,
    activities: [],
    bookmarks: []
};

// ─── LOAD ACTIVITIES ─────────────────────────────────────────

/**
 * Load activities from Supabase
 */
async function loadActivities(reset = true) {
    if (reset) {
        activitiesState.page = 0;
        activitiesState.hasMore = true;
        activitiesState.activities = [];
        const container = document.getElementById('activitiesContainer');
        if (container) container.innerHTML = '';
    }

    if (!activitiesState.hasMore || activitiesState.isLoading) return;

    activitiesState.isLoading = true;
    document.getElementById('activitiesLoader')?.classList.add('active');

    try {
        const pageSize = 10;
        const offset = activitiesState.page * pageSize;

        let query = supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        // Apply filters
        if (activitiesState.currentFilter !== 'all') {
            query = query.eq('category', activitiesState.currentFilter);
        }
        if (activitiesState.currentDifficulty !== 'all') {
            query = query.eq('difficulty', activitiesState.currentDifficulty);
        }
        if (activitiesState.searchQuery) {
            query = query.ilike('title', `%${activitiesState.searchQuery}%`);
        }

        const { data: activities, error } = await query;

        if (error) throw error;

        if (!activities || activities.length === 0) {
            activitiesState.hasMore = false;
            document.getElementById('activitiesLoader')?.classList.remove('active');
            if (activitiesState.activities.length === 0) {
                renderActivitiesEmptyState();
            }
            return;
        }

        activitiesState.activities = [...activitiesState.activities, ...activities];

        activities.forEach(activity => {
            const card = createActivityCard(activity);
            document.getElementById('activitiesContainer').appendChild(card);
        });

        activitiesState.page++;
        document.getElementById('activitiesLoader')?.classList.remove('active');

    } catch (error) {
        console.error('Error loading activities:', error);
        document.getElementById('activitiesLoader')?.classList.remove('active');
        showToast('Failed to load activities', 'error');
    } finally {
        activitiesState.isLoading = false;
    }
}

/**
 * Render empty state when no activities match filters
 */
function renderActivitiesEmptyState() {
    const container = document.getElementById('activitiesContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <span class="empty-state-icon">🎯</span>
            <div class="empty-state-title">No activities found</div>
            <div class="empty-state-description">Try a different filter or search term.</div>
        </div>
    `;
}

/**
 * Create activity card
 */
function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card card-premium fade-in';

    const difficultyStars = {
        easy: '⭐',
        medium: '⭐⭐',
        hard: '⭐⭐⭐'
    };

    card.innerHTML = `
        <div class="activity-card-image">
            ${activity.image_url ?
                `<img src="${activity.image_url}" alt="${activity.title}" />` :
                `<div class="activity-card-placeholder">🎯</div>`
            }
        </div>
        <div class="activity-card-body">
            <div class="activity-card-header">
                <h3 class="activity-card-title">${activity.title}</h3>
                <button class="activity-bookmark ${isBookmarked(activity.id) ? 'bookmarked' : ''}"
                        onclick="toggleBookmark('${activity.id}')">
                    <i class="fas ${isBookmarked(activity.id) ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                </button>
            </div>
            <p class="activity-card-description">${activity.description || ''}</p>
            <div class="activity-card-meta">
                <span class="badge badge-blue">${activity.category || 'General'}</span>
                <span>⏱️ ${activity.duration_minutes || '—'} min</span>
                <span>${difficultyStars[activity.difficulty] || '⭐'}</span>
            </div>
            <div class="activity-card-actions">
                <button class="btn btn-primary btn-sm" onclick="startActivityTask('${activity.id}')">
                    ▶️ Start
                </button>
                ${activity.materials?.length ?
                    `<button class="btn btn-secondary btn-sm" onclick="showMaterials('${activity.id}')">
                        📋 Materials
                    </button>` : ''
                }
            </div>
        </div>
    `;

    return card;
}

/**
 * Check if activity is bookmarked
 */
function isBookmarked(activityId) {
    return activitiesState.bookmarks.includes(activityId);
}

/**
 * Load the current user's bookmarks (call once on page init)
 */
async function loadBookmarks() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('bookmarks')
            .select('activity_id')
            .eq('user_id', user.id);

        if (error) throw error;
        activitiesState.bookmarks = (data || []).map(b => b.activity_id);
    } catch (error) {
        console.error('Error loading bookmarks:', error);
    }
}

/**
 * Toggle bookmark
 */
async function toggleBookmark(activityId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const bookmarked = activitiesState.bookmarks.includes(activityId);

        if (bookmarked) {
            // Remove bookmark
            const { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('activity_id', activityId);

            if (error) throw error;

            activitiesState.bookmarks = activitiesState.bookmarks.filter(id => id !== activityId);
            showToast('Bookmark removed', 'info');

        } else {
            // Add bookmark
            const { error } = await supabase
                .from('bookmarks')
                .insert({
                    user_id: user.id,
                    activity_id: activityId
                });

            if (error) throw error;

            activitiesState.bookmarks.push(activityId);
            showToast('Bookmarked! ⭐', 'success');
        }

        // Refresh activities
        loadActivities(true);

    } catch (error) {
        console.error('Error toggling bookmark:', error);
        showToast('Failed to toggle bookmark', 'error');
    }
}

/**
 * Start activity task
 */
async function startActivityTask(activityId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!state.activeChild) {
            showToast('Please select a child first', 'warning');
            return;
        }

        // Check if already started
        const { data: existing } = await supabase
            .from('child_activities')
            .select('*')
            .eq('child_id', state.activeChild.id)
            .eq('activity_id', activityId)
            .maybeSingle();

        if (existing) {
            showToast('Activity already in progress', 'info');
            return;
        }

        // Create child activity
        await createChildActivity({
            child_id: state.activeChild.id,
            activity_id: activityId,
            scheduled_date: new Date().toISOString().split('T')[0],
            completed: false
        });

        showToast('Activity started! 🚀', 'success');

        // Refresh activities
        loadActivities(true);

    } catch (error) {
        console.error('Error starting activity:', error);
        showToast('Failed to start activity', 'error');
    }
}

/**
 * Show materials for activity
 */
function showMaterials(activityId) {
    const activity = activitiesState.activities.find(a => a.id === activityId);
    if (!activity || !activity.materials?.length) return;

    createModal({
        id: 'materialsModal',
        header: '📋 Materials Needed',
        body: `
            <ul style="list-style:none;padding:0;">
                ${activity.materials.map(m => `
                    <li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">✅ ${m}</li>
                `).join('')}
            </ul>
        `,
        footer: `<button class="btn btn-primary" onclick="hideModal('materialsModal')">Got it!</button>`
    });

    showModal('materialsModal');
}

// ─── FILTER ACTIVITIES ───────────────────────────────────────

/**
 * Filter activities by category
 */
function filterActivities(category) {
    activitiesState.currentFilter = category;
    loadActivities(true);
}

/**
 * Filter activities by difficulty
 */
function filterByDifficulty(difficulty) {
    activitiesState.currentDifficulty = difficulty;
    loadActivities(true);
}

/**
 * Search activities
 */
function searchActivities(query) {
    activitiesState.searchQuery = query;
    loadActivities(true);
}

// ─── ACTIVITY CATEGORIES ─────────────────────────────────────

const ACTIVITY_CATEGORIES = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'communication', label: 'Communication', icon: '🗣️' },
    { id: 'learning', label: 'Learning', icon: '📚' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'sensory', label: 'Sensory', icon: '🎨' },
    { id: 'motor', label: 'Motor', icon: '🏃' },
    { id: 'daily_living', label: 'Daily Living', icon: '🧹' }
];

const DIFFICULTY_OPTIONS = [
    { id: 'all', label: 'All Levels' },
    { id: 'easy', label: '⭐ Easy' },
    { id: 'medium', label: '⭐⭐ Medium' },
    { id: 'hard', label: '⭐⭐⭐ Hard' }
];

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.loadActivities = loadActivities;
window.loadBookmarks = loadBookmarks;
window.filterActivities = filterActivities;
window.filterByDifficulty = filterByDifficulty;
window.searchActivities = searchActivities;
window.toggleBookmark = toggleBookmark;
window.startActivityTask = startActivityTask;
window.showMaterials = showMaterials;
window.ACTIVITY_CATEGORIES = ACTIVITY_CATEGORIES;
window.DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS;

console.log('🧠 NeuroSarathi V2 — Activities Module Loaded');
