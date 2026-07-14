// ============================================================
// NEUROSARATHI V3 — ui/modals.js
// Modal Management with ID Deduplication
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};
NeuroSarathi.UI = NeuroSarathi.UI || {};

NeuroSarathi.UI.Modals = {
    _activeModals: [],
    _modalStack: [],

    create: function(options) {
        const id = options.id || `modal-${Date.now()}`;

        const existing = document.getElementById(id);
        if (existing) {
            existing.remove();
            this._activeModals = this._activeModals.filter(mid => mid !== id);
            this._modalStack = this._modalStack.filter(mid => mid !== id);
        }

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${id}-title`);

        let headerHtml = '';
        if (options.header) {
            headerHtml = `<div class="modal-header"><h2 id="${id}-title">${options.header}</h2></div>`;
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="NeuroSarathi.UI.Modals.hide('${id}')"></div>
            <div class="modal-content ${options.size || 'modal-md'}">
                ${headerHtml}
                <div class="modal-body">${options.body || ''}</div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
                <button class="modal-close" onclick="NeuroSarathi.UI.Modals.hide('${id}')" aria-label="Close modal">×</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal._content = modal.querySelector('.modal-content');
        return modal;
    },

    show: function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal "${modalId}" not found`);
            return;
        }
        modal.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        if (!this._activeModals.includes(modalId)) {
            this._activeModals.push(modalId);
            this._modalStack.push(modalId);
        }
    },

    hide: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal-open');
            document.body.style.overflow = '';
            this._activeModals = this._activeModals.filter(id => id !== modalId);
            this._modalStack = this._modalStack.filter(id => id !== modalId);
            if (this._activeModals.length === 0) {
                document.body.style.overflow = '';
            }
        }
    },

    hideAll: function() {
        const modals = [...this._activeModals];
        for (const id of modals) this.hide(id);
        this._activeModals = [];
        this._modalStack = [];
        document.body.style.overflow = '';
    },

    isOpen: function(modalId) {
        const modal = document.getElementById(modalId);
        return modal ? modal.classList.contains('modal-open') : false;
    },

    getTopModal: function() {
        if (this._modalStack.length === 0) return null;
        return this._modalStack[this._modalStack.length - 1];
    },

    getContent: function(modalId) {
        const modal = document.getElementById(modalId);
        return modal ? modal._content || modal.querySelector('.modal-content') : null;
    },

    updateBody: function(modalId, newBody) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const body = modal.querySelector('.modal-body');
        if (body) body.innerHTML = newBody;
    },

    updateFooter: function(modalId, newFooter) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const footer = modal.querySelector('.modal-footer');
        if (footer) footer.innerHTML = newFooter;
    },

    updateHeader: function(modalId, newHeader) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const header = modal.querySelector('.modal-header');
        if (header) header.innerHTML = newHeader;
    }
};

function showModal(modalId) { NeuroSarathi.UI.Modals.show(modalId); }
function hideModal(modalId) { NeuroSarathi.UI.Modals.hide(modalId); }
function createModal(options) { return NeuroSarathi.UI.Modals.create(options); }

window.showModal = showModal;
window.hideModal = hideModal;
window.createModal = createModal;
window.NeuroSarathi = NeuroSarathi;

console.log('✅ Modals module loaded');
