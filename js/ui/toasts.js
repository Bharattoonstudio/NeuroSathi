// ============================================================
// NEUROSARATHI V3 — ui/toasts.js
// Toast Notification System
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};
NeuroSarathi.UI = NeuroSarathi.UI || {};

NeuroSarathi.UI.Toasts = {
    _container: null,
    _defaultDuration: 4000,
    _maxToasts: 5,
    _toastQueue: [],

    _getContainer: function() {
        if (this._container && document.body.contains(this._container)) {
            return this._container;
        }
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        this._container = container;
        return container;
    },

    show: function(message, type = 'success', duration = null) {
        const container = this._getContainer();
        const actualDuration = duration || this._defaultDuration;

        const currentToasts = container.querySelectorAll('.toast').length;
        if (currentToasts >= this._maxToasts) {
            const oldest = container.querySelector('.toast');
            if (oldest) this._dismiss(oldest);
        }

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Dismiss notification">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._dismiss(toast));
        }

        container.appendChild(toast);

        const timeoutId = setTimeout(() => this._dismiss(toast), actualDuration);
        toast._timeoutId = timeoutId;
        return toast;
    },

    _dismiss: function(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;
        if (toast._timeoutId) clearTimeout(toast._timeoutId);
        toast.classList.add('toast-hide');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    },

    success: function(message, duration) { return this.show(message, 'success', duration); },
    error: function(message, duration) { return this.show(message, 'error', duration); },
    warning: function(message, duration) { return this.show(message, 'warning', duration); },
    info: function(message, duration) { return this.show(message, 'info', duration); },

    dismissAll: function() {
        const container = this._getContainer();
        const toasts = container.querySelectorAll('.toast');
        for (const toast of toasts) this._dismiss(toast);
    }
};

function showToast(message, type = 'success') {
    return NeuroSarathi.UI.Toasts.show(message, type);
}

window.showToast = showToast;
window.NeuroSarathi = NeuroSarathi;

console.log('✅ Toasts module loaded');
