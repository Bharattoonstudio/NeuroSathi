// ============================================================
// NEUROSARATHI V3 — neuro-sarathi.js
// Main Namespace & Initialization
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.init = async function() {
    console.log('🧠 NeuroSarathi V3 — Initializing...');

    try {
        await this._loadCoreModules();
        await NeuroSarathi.Dashboard.init();

        console.log('✅ NeuroSarathi V3 — Ready');

    } catch (error) {
        console.error('❌ NeuroSarathi initialization failed:', error);
        NeuroSarathi.UI.Toasts.show('Failed to initialize. Please refresh.', 'error');
    }
};

NeuroSarathi._loadCoreModules = async function() {
    const requiredModules = [
        'State', 'Auth', 'API', 'UI', 'Children', 'Dashboard', 'Feed',
        'Routines', 'Journal', 'Observations', 'Notifications', 'Search', 'Chat'
    ];

    const missing = requiredModules.filter(name => {
        const parts = name.split('.');
        let current = NeuroSarathi;
        for (const part of parts) {
            if (!current[part]) return true;
            current = current[part];
        }
        return false;
    });

    if (missing.length > 0) {
        console.warn('⚠️ Missing modules:', missing.join(', '));
    }

    return true;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        NeuroSarathi.init();
    });
} else {
    NeuroSarathi.init();
}

console.log('🧠 NeuroSarathi V3 — Namespace created');
