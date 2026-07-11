// ============================================================
// NEUROSARATHI V2 — feed.js
// Facebook-Style Feed Module
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const feedState = {
    page: 0,
    hasMore: true,
    isLoading: false,
    items: [],
    types: ['activity', 'observation', 'milestone', 'tip', 'resource', 'scheme', 'community']
};

// ─── FEED CONFIGURATION ──────────────────────────────────────

const FEED_TYPES = {
    activity: { icon: '🎯', label: 'Activity', color: '#5b8dd9' },
    observation: { icon: '💭', label: 'Observation', color: '#8b5cf6' },
    milestone: { icon: '🏆', label: 'Milestone', color: '#34d399' },
    tip: { icon: '💡', label: 'Tip', color: '#f59e0b' },
    resource: { icon: '📚', label: 'Resource', color: '#ec4899' },
    scheme: { icon: '🏛️', label: 'Government Scheme', color: '#06b6d4' },
    community: { icon: '👨‍👩‍👧‍👦', label: 'Community', color: '#8b5cf6' }
};

// ─── LOAD FEED ────────────────────────────────────────────────

/**
 * Load feed items with pagination
 */
async function loadFeed(reset = true) {
    if (reset) {
        feedState.page = 0;
        feedState.hasMore = true;
        feedState.items = [];
        document.getElementById('feedContainer').innerHTML = '';
    }

    if (!feedState.hasMore || feedState.isLoading) return;

    feedState.isLoading = true;
    document.getElementById('feedLoader').classList.add('active');

    try {
        const pageSize = 5;
        const offset = feedState.page * pageSize;

        const items = await getFeedItems(offset, pageSize);

        if (items.length === 0) {
            feedState.hasMore = false;
            document.getElementById('feedLoader').classList.remove('active');
            return;
        }

        feedState.items = [...feedState.items, ...items];

        items.forEach(item => {
            const card = createFeedCard(item);
            document.getElementById('feedContainer').appendChild(card);
        });

        feedState.page++;
        document.getElementById('feedLoader').classList.remove('active');

    } catch (error) {
        console.error('Error loading feed:', error);
        document.getElementById('feedLoader').classList.remove('active');
        showToast('Failed to load feed', 'error');
    } finally {
        feedState.isLoading = false;
    }
}

/**
 * Get feed items from various sources
 */
async function getFeedItems(offset, limit) {
    const items = [];
    const childId = state.activeChild?.id;

    try {
        // 1. Get child activities
        if (childId) {
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
        }

        // 2. Get observations
        if (childId) {
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
        }

        // 3. Get learning resources (some random ones)
        const { data: resources } = await supabase
            .from('learning_resources')
            .select('*')
            .limit(2);

        if (resources) {
            resources.forEach(res => {
                items.push({ type: 'resource', id: res.id, data: res, created_at: res.created_at });
            });
        }

        // 4. Get government schemes (some random ones)
        const { data: schemes } = await supabase
            .from('learning_resources')
            .select('*')
            .eq('category', 'government_scheme')
            .limit(2);

        if (schemes) {
            schemes.forEach(scheme => {
                items.push({ type: 'scheme', id: scheme.id, data: scheme, created_at: scheme.created_at });
            });
        }

        // Sort by created_at
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return items.slice(0, limit);

    } catch (error) {
        console.error('Error fetching feed items:', error);
        return [];
    }
}

/**
 * Create a feed card element
 */
function createFeedCard(item) {
    const card = document.createElement('div');
    card.className = 'feed-card fade-in';

    const typeInfo = FEED_TYPES[item.type] || FEED_TYPES.activity;

    let content = '';
    let actions = '';

    switch (item.type) {
        case 'activity': {
            const activity = item.data.activities;
            content = `
                <div class="feed-card-title">${activity?.title || 'Learning Activity'}</div>
                <div class="feed-card-description">${activity?.description || 'Complete today\'s activity'}</div>
                <div class="feed-card-meta">
                    <span>⏱️ ${activity?.duration_minutes || '—'} min</span>
                    <span>⭐ ${activity?.difficulty || 'Medium'}</span>
                    <span>${item.data.completed ? '✅ Completed' : '⏳ In Progress'}</span>
                </div>
            `;
            actions = `
                <button class="btn btn-primary btn-sm" onclick="startActivity('${item.data.id}')">
                    ${item.data.completed ? '🔄 Replay' : '▶️ Start'}
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

        case 'resource':
            content = `
                <div class="feed-card-title">📚 ${item.data.title}</div>
                <div class="feed-card-description">${item.data.description || ''}</div>
                <div class="feed-card-meta">
                    <span>📖 ${item.data.reading_time_minutes || '5'} min read</span>
                    <span>${item.data.difficulty || 'Beginner'}</span>
                </div>
            `;
            actions = `
                <button class="btn btn-secondary btn-sm" onclick="window.open('${item.data.url || '#'}', '_blank')">
                    📖 Read More
                </button>
            `;
            break;

        case 'scheme':
            content = `
                <div class="feed-card-title">🏛️ ${item.data.title}</div>
                <div class="feed-card-description">${item.data.description || ''}</div>
                <div class="feed-card-meta">
                    <span>🏛️ Government Scheme</span>
                </div>
            `;
            actions = `
                <button class="btn btn-secondary btn-sm" onclick="window.open('${item.data.url || '#'}', '_blank')">
                    📋 Learn More
                </button>
            `;
            break;

        default:
            content = `
                <div class="feed-card-title">${item.data.title || 'Update'}</div>
                <div class="feed-card-description">${item.data.description || 'New update available'}</div>
            `;
    }

    card.innerHTML = `
        <div class="feed-card-header">
            <span class="feed-card-icon">${typeInfo.icon}</span>
            <span class="feed-card-type" style="color:${typeInfo.color}">${typeInfo.label}</span>
            <span class="feed-card-time">${formatDate(item.created_at)}</span>
        </div>
        ${content}
        ${actions ? `<div class="feed-card-actions">${actions}</div>` : ''}
    `;

    return card;
}

// ─── INFINITE SCROLL ─────────────────────────────────────────

/**
 * Setup infinite scroll
 */
function setupInfiniteScroll() {
    const feedContainer = document.getElementById('feedContainer');
    if (!feedContainer) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !feedState.isLoading && feedState.hasMore) {
                loadFeed(false);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.1
    });

    // Observe the last card when it's added
    const observerCallback = (mutations) => {
        mutations.forEach(() => {
            const lastCard = feedContainer.lastElementChild;
            if (lastCard && !lastCard.classList.contains('feed-loader')) {
                observer.observe(lastCard);
            }
        });
    };

    // Watch for new cards being added
    const mutationObserver = new MutationObserver(observerCallback);
    mutationObserver.observe(feedContainer, { childList: true });
}

// ─── REFRESH FEED ─────────────────────────────────────────────

/**
 * Refresh the feed
 */
function refreshFeed() {
    loadFeed(true);
    showToast('Feed refreshed! 🔄', 'success');
}

// ─── START ACTIVITY ──────────────────────────────────────────

/**
 * Start an activity
 */
async function startActivity(activityId) {
    try {
        // Update activity status
        await updateChildActivity(activityId, {
            completed: true,
            completed_at: new Date().toISOString()
        });

        showToast('Activity completed! 🎉', 'success');

        // Refresh feed and stats
        loadFeed(true);
        loadStats();

    } catch (error) {
        console.error('Error starting activity:', error);
        showToast('Failed to complete activity', 'error');
    }
}

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.loadFeed = loadFeed;
window.refreshFeed = refreshFeed;
window.startActivity = startActivity;
window.setupInfiniteScroll = setupInfiniteScroll;

console.log('🧠 NeuroSarathi V2 — Feed Module Loaded');
