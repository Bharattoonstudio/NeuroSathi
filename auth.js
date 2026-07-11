// ============================================================
// NEUROSARATHI V3 — core/auth.js
// Authentication Module
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Auth = {
    _sessionCheckInterval: null,

    getSession: async function() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            return data.session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    },

    getUser: async function() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            return data.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    signIn: async function(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(), password: password
            });
            if (error) throw error;
            NeuroSarathi.State.set('user', data.user);
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    },

    signUp: async function(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(), password: password,
                options: { data: { full_name: metadata.full_name || '', ...metadata } }
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    },

    logout: async function() {
        try {
            await supabase.auth.signOut();
            NeuroSarathi.State.reset();
            window.location.href = '/enterportal.html';
        } catch (error) {
            console.error('Logout error:', error);
            NeuroSarathi.UI.Toasts.show('Failed to logout', 'error');
        }
    },

    resetPassword: async function(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    },

    updatePassword: async function(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Update password error:', error);
            throw error;
        }
    },

    isAuthenticated: async function() {
        const user = await this.getUser();
        return !!user;
    },

    requireAuth: async function() {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            window.location.href = '/enterportal.html';
            return false;
        }
        return true;
    },

    setupSessionMonitoring: function() {
        if (this._sessionCheckInterval) {
            clearInterval(this._sessionCheckInterval);
        }
        this._sessionCheckInterval = setInterval(async () => {
            const session = await this.getSession();
            if (!session) {
                NeuroSarathi.UI.Toasts.show('Session expired. Please login again.', 'warning');
                window.location.href = '/enterportal.html';
            }
        }, 300000);
    }
};

// ─── ALIASES FOR BACKWARD COMPATIBILITY ──────────────────────
// NOTE: these return the UNWRAPPED value (e.g. getCurrentUser()
// resolves directly to the user object, not { data: { user } }).
// This is a deliberate shape decision — every call site (dashboard.js)
// has been updated to `const user = await getCurrentUser();`
// rather than destructuring `{ data: { user } }`. Do not revert this
// alias to wrap the raw supabase.auth.getUser() response without also
// reverting every call site — the two must stay in sync.

function getCurrentUser() {
    return NeuroSarathi.Auth.getUser();
}

function getSession() {
    return NeuroSarathi.Auth.getSession();
}

function signOut() {
    return NeuroSarathi.Auth.logout();
}

window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.signOut = signOut;
window.NeuroSarathi = NeuroSarathi;

console.log('✅ Auth module loaded');
