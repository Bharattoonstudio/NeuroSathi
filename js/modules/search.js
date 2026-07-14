// ============================================================
// NEUROSARATHI V3 — modules/search.js
// Global Search Module — Final
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Search = {
    _debounceTimer: null,
    _lastQuery: '',
    _isSearching: false,

    perform: async function(query) {
        if (!query || query.length < 2) {
            NeuroSarathi.Feed.load(true);
            return;
        }

        this._lastQuery = query;
        this._isSearching = true;

        NeuroSarathi.State.setLoading('search', true);
        NeuroSarathi.UI.Skeleton.show('feedContainer', 3, 'card');

        try {
            const results = await this._searchAll(query);
            this._renderResults(results);

        } catch (error) {
            console.error('Search error:', error);
            NeuroSarathi.UI.Toasts.show('Search failed. Please try again.', 'error');

            const container = document.getElementById('feedContainer');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-state-icon">🔍</span>
                        <div class="empty-state-title">Search failed</div>
                        <div class="empty-state-description">Something went wrong. Please try again.</div>
                        <button class="btn btn-primary btn-sm" onclick="NeuroSarathi.Search.retry()" style="margin-top:12px;">
                            <i class="fas fa-rotate"></i>
                            Retry
                        </button>
                    </div>
                `;
                NeuroSarathi.UI.Skeleton.markReal('feedContainer');
            }

        } finally {
            NeuroSarathi.State.setLoading('search', false);
            NeuroSarathi.UI.Skeleton.hide('feedContainer');
            this._isSearching = false;
        }
    },

    retry: function() {
        if (this._lastQuery) {
            this.perform(this._lastQuery);
        } else {
            NeuroSarathi.Feed.load(true);
        }
    },

    _searchAll: async function(query) {
        const results = [];
        const childId = NeuroSarathi.State.get('activeChild.id');

        try {
            const { data: activities } = await supabase
                .from('activities')
                .select('*')
                .ilike('title', `%${query}%`)
                .limit(5);

            if (activities) {
                activities.forEach(act => {
                    results.push({ type: 'activity', id: act.id, data: act, created_at: act.created_at, score: 1 });
                });
            }

            const { data: resources } = await supabase
                .from('learning_resources')
                .select('*')
                .ilike('title', `%${query}%`)
                .limit(5);

            if (resources) {
                resources.forEach(res => {
                    results.push({ type: 'resource', id: res.id, data: res, created_at: res.created_at, score: 1 });
                });
            }

            if (childId) {
                const { data: observations } = await supabase
                    .from('observations')
                    .select('*')
                    .eq('child_id', childId)
                    .ilike('content', `%${query}%`)
                    .limit(3);

                if (observations) {
                    observations.forEach(obs => {
                        results.push({ type: 'observation', id: obs.id, data: obs, created_at: obs.created_at, score: 1 });
                    });
                }
            }

            results.sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return new Date(b.created_at) - new Date(a.created_at);
            });

            return results.slice(0, 15);

        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    },

    _renderResults: function(results) {
        const container = document.getElementById('feedContainer');
        if (!container) return;

        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔍</span>
                    <div class="empty-state-title">No results found</div>
                    <div class="empty-state-description">
                        Try adjusting your search. You can search for activities, articles, or observations.
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="NeuroSarathi.Search.clear()" style="margin-top:12px;">
                        <i class="fas fa-arrow-left"></i>
                        Back to Feed
                    </button>
                </div>
            `;
            NeuroSarathi.UI.Skeleton.markReal('feedContainer');
            return;
        }

        const header = document.createElement('div');
        header.className = 'search-header';
        header.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 4px 16px 4px; border-bottom: 1px solid rgba(203, 213, 225, 0.2);
            margin-bottom: 16px;
        `;
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#94a3b8;">
                <i class="fas fa-search"></i>
                <span>${results.length} results found for "<strong>${this._lastQuery}</strong>"</span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="NeuroSarathi.Search.clear()">
                <i class="fas fa-times"></i>
                Clear
            </button>
        `;
        container.appendChild(header);

        for (const result of results) {
            const card = NeuroSarathi.UI.Feed.createCard(result);
            container.appendChild(card);
        }

        NeuroSarathi.UI.Skeleton.markReal('feedContainer');
    },

    clear: function() {
        this._lastQuery = '';
        const input = document.getElementById('globalSearch');
        if (input) input.value = '';
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.style.display = 'none';
        NeuroSarathi.Feed.load(true);
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Search module loaded');
