// ============================================================
// NEUROSARATHI V3 — core/state.js
// Centralized State Management with Dot-Path Access
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.State = {
    _data: {
        user: null,
        profile: null,
        children: [],
        activeChild: null,
        currentPage: 'home',
        isLoading: false,
        isFirstLogin: false,
        onboardingComplete: false,

        loading: {
            dashboard: false, feed: false, journal: false,
            child: false, notifications: false, search: false
        },

        errors: {
            dashboard: null, feed: null, api: null, child: null, search: null
        },

        cache: { dashboardLoadedAt: null, feedLoadedAt: null },

        dashboard: {
            stats: {
                activities: 0, observations: 0, documents: 0, streak: 0,
                xp: 0, completedToday: 0, level: 1, nextLevelXp: 100
            },
            gamification: { xp: 0, badges: [], level: 1, nextLevelXp: 100 },
            routines: [], journal: [], learning: [], timeline: [],
            badges: [], notifications: []
        }
    },

    _listeners: [],
    _cacheTimeout: 60000,

    get: function(key) {
        if (!key) return this._data;
        const parts = key.split('.');
        let value = this._data;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }
        return value;
    },

    set: function(key, value) {
        const parts = key.split('.');
        let current = this._data;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        const oldValue = current[parts[parts.length - 1]];
        current[parts[parts.length - 1]] = value;
        this._notifyListeners(key, value, oldValue);
        return this;
    },

    update: function(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
        return this;
    },

    subscribe: function(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    },

    reset: function() {
        this._data = {
            user: null, profile: null, children: [], activeChild: null,
            currentPage: 'home', isLoading: false, isFirstLogin: false,
            onboardingComplete: false,
            loading: { dashboard: false, feed: false, journal: false, child: false, notifications: false, search: false },
            errors: { dashboard: null, feed: null, api: null, child: null, search: null },
            cache: { dashboardLoadedAt: null, feedLoadedAt: null },
            dashboard: {
                stats: { activities: 0, observations: 0, documents: 0, streak: 0, xp: 0, completedToday: 0, level: 1, nextLevelXp: 100 },
                gamification: { xp: 0, badges: [], level: 1, nextLevelXp: 100 },
                routines: [], journal: [], learning: [], timeline: [], badges: [], notifications: []
            }
        };
        this._listeners = [];
        return this;
    },

    isCacheValid: function(cacheKey) {
        const cachedAt = this.get(`cache.${cacheKey}`);
        if (!cachedAt) return false;
        return (Date.now() - cachedAt) < this._cacheTimeout;
    },

    markCacheFresh: function(cacheKey) {
        this.set(`cache.${cacheKey}`, Date.now());
        return this;
    },

    setLoading: function(section, isLoading) {
        this.set(`loading.${section}`, isLoading);
        const loadingStates = this.get('loading');
        const anyLoading = Object.values(loadingStates).some(v => v === true);
        this.set('isLoading', anyLoading);
        return this;
    },

    setError: function(section, error) {
        this.set(`errors.${section}`, error);
        return this;
    },

    clearError: function(section) {
        this.set(`errors.${section}`, null);
        return this;
    },

    _notifyListeners: function(key, value, oldValue) {
        for (const listener of this._listeners) {
            try {
                listener(key, value, oldValue, this._data);
            } catch (error) {
                console.error('State listener error:', error);
            }
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ State module loaded');
