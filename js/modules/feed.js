// ============================================================
// NEUROSARATHI V3 — modules/feed.js
// Facebook-Style Feed — Final
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Feed = {
    _state: {
        page: 0,
        hasMore: true,
        isLoading: false,
        items: []
    },

    load: async function(reset = true) {
        if (reset) {
            this._state.page = 0;
            this._state.hasMore = true;
            this._state.items = [];
            const container = document.getElementById('feedContainer');
            if (container) {
                container.innerHTML = '';
                // Mark that we've taken over this container — prevents
                // Skeleton.hide() from wiping content once it's real.
                NeuroSarathi.UI.Skeleton.markReal('feedContainer');
            }
        }

        if (!this._state.hasMore || this._state.isLoading) return;

        this._state.isLoading = true;
        NeuroSarathi.UI.Feed.showLoader();

        try {
            const childId = NeuroSarathi.State.get('activeChild.id');
            if (!childId) {
                NeuroSarathi.UI.Feed.hideLoader();
                return;
            }

            const items = await NeuroSarathi.API.getFeed(
                childId, this._state.page * 10, 10
            );

            if (!items || items.length === 0) {
                this._state.hasMore = false;
                if (this._state.page === 0) {
                    NeuroSarathi.UI.Feed.showEmpty();
                    NeuroSarathi.UI.Skeleton.markReal('feedContainer');
                }
                NeuroSarathi.UI.Feed.hideLoader();
                return;
            }

            this._state.items = [...this._state.items, ...items];

            const container = document.getElementById('feedContainer');
            for (const item of items) {
                const card = NeuroSarathi.UI.Feed.createCard(item);
                container?.appendChild(card);
            }

            NeuroSarathi.UI.Skeleton.markReal('feedContainer');

            this._state.page++;
            NeuroSarathi.UI.Feed.hideLoader();

        } catch (error) {
            console.error('Error loading feed:', error);
            NeuroSarathi.UI.Feed.hideLoader();
            NeuroSarathi.UI.Toasts.show('Failed to load feed', 'error');
        } finally {
            this._state.isLoading = false;
        }
    },

    refresh: function() {
        this.load(true);
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Feed module loaded');
