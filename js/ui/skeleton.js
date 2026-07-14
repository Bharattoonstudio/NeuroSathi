// ============================================================
// NEUROSARATHI V3 — ui/skeleton.js
// Loading Skeletons — FIXED (hide() no longer wipes real content;
// markReal() must be called by any module that replaces skeleton
// content with real content — see feed.js and search.js)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};
NeuroSarathi.UI = NeuroSarathi.UI || {};

NeuroSarathi.UI.Skeleton = {
    show: function(containerId, count = 3, type = 'card') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (container.children.length > 0 && !container.dataset.skeleton) {
            return;
        }

        container.dataset.skeleton = 'true';
        container.innerHTML = '';

        const skeletonTypes = {
            card: this._createCardSkeleton,
            feed: this._createFeedSkeleton,
            activity: this._createActivitySkeleton,
            routine: this._createRoutineSkeleton,
            journal: this._createJournalSkeleton,
            profile: this._createProfileSkeleton,
            stats: this._createStatsSkeleton
        };

        const createFn = skeletonTypes[type] || this._createCardSkeleton;

        for (let i = 0; i < count; i++) {
            const skeleton = createFn.call(this);
            skeleton.classList.add('fade-in');
            container.appendChild(skeleton);
        }
    },

    hide: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!container.dataset.skeleton) return; // real content already took over — don't touch it
        delete container.dataset.skeleton;
        container.innerHTML = '';
    },

    markReal: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        delete container.dataset.skeleton;
    },

    isShowing: function(containerId) {
        const container = document.getElementById(containerId);
        return container ? !!container.dataset.skeleton : false;
    },

    _createCardSkeleton: function() {
        const div = document.createElement('div');
        div.className = 'skeleton skeleton-card';
        div.style.cssText = `background: rgba(255,255,255,0.6); border-radius: 20px; padding: 20px; border: 1px solid rgba(0,0,0,0.04); margin-bottom: 12px;`;
        div.innerHTML = `
            <div class="skeleton-img shimmer" style="height:140px;border-radius:12px;background:rgba(226,232,240,0.6);margin-bottom:12px;"></div>
            <div class="skeleton-line shimmer" style="height:16px;background:rgba(226,232,240,0.6);border-radius:8px;margin-bottom:8px;width:60%;"></div>
            <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;margin-bottom:6px;width:80%;"></div>
            <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;width:40%;"></div>
        `;
        return div;
    },

    _createFeedSkeleton: function() {
        const div = document.createElement('div');
        div.className = 'skeleton skeleton-feed';
        div.style.cssText = `background: rgba(255,255,255,0.6); border-radius: 16px; padding: 16px 20px; border: 1px solid rgba(0,0,0,0.04); margin-bottom: 12px;`;
        div.innerHTML = `
            <div class="skeleton-line shimmer" style="height:14px;background:rgba(226,232,240,0.6);border-radius:8px;width:40%;margin-bottom:12px;"></div>
            <div class="skeleton-line shimmer" style="height:16px;background:rgba(226,232,240,0.6);border-radius:8px;width:70%;margin-bottom:8px;"></div>
            <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;width:90%;margin-bottom:6px;"></div>
            <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;width:60%;"></div>
        `;
        return div;
    },

    _createActivitySkeleton: function() {
        const div = document.createElement('div');
        div.className = 'skeleton skeleton-activity';
        div.style.cssText = `background: rgba(255,255,255,0.6); border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.04);`;
        div.innerHTML = `
            <div class="skeleton-img shimmer" style="height:120px;background:rgba(226,232,240,0.6);"></div>
            <div style="padding:16px;">
                <div class="skeleton-line shimmer" style="height:14px;background:rgba(226,232,240,0.6);border-radius:8px;width:50%;margin-bottom:8px;"></div>
                <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;width:80%;margin-bottom:6px;"></div>
                <div class="skeleton-line shimmer" style="height:12px;background:rgba(226,232,240,0.6);border-radius:8px;width:40%;"></div>
            </div>
        `;
        return div;
    },

    _createRoutineSkeleton: function() {
        const div = document.createElement('div');
        div.className = 'skeleton skeleton-routine';
        div.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(226,232,240,0.3);`;
        div.innerHTML = `
            <div class="skeleton-line shimmer" style="height:14px;background:rgba(226,232,240,0.6);border-radius:8px;width:60px;flex-shrink:0;"></div>
            <div class="skeleton-line shimmer" style="height:14px;background:rgba(226,232,240,0.6);border-radius:8px;flex:1;"></div>
            <div class="skeleton-line shimmer" style="height:20px;background:rgba(226,232,240,0.6);border-radius:8px;width:24px;flex-shrink:0;"></div>
        `;
        return div;
    },

    _createJournalSkeleton: function() {
        const div = document.createElement('div');
        div.className = 'skeleton skeleton-journal';
        div.style.cssText = `background: rgba(255,255,255,0.6); border-radius: 12px; padding: 14px 16px; border: 
