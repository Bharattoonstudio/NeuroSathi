// ============================================================
// NEUROSARATHI V3 — modules/notifications.js
// Notification Module
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Notifications = {
    _state: {
        isOpen: false,
        subscription: null,
        unreadCount: 0
    },

    load: async function() {
        try {
            const user = NeuroSarathi.State.get('user');
            if (!user) return [];

            const notifications = await getNotifications(user.id, 20);
            NeuroSarathi.State.set('dashboard.notifications', notifications);

            const unreadCount = notifications.filter(n => !n.read).length;
            this._state.unreadCount = unreadCount;
            this._updateBadge(unreadCount);

            this._render(notifications);
            return notifications;

        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    },

    toggle: function() {
        this._state.isOpen = !this._state.isOpen;
        const panel = document.getElementById('notificationPanel');
        if (panel) panel.classList.toggle('open');
        if (this._state.isOpen) this.load();
    },

    markRead: async function(notificationId) {
        try {
            await markNotificationRead(notificationId);
            await this.load();
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    },

    markAllRead: async function() {
        try {
            const user = NeuroSarathi.State.get('user');
            if (!user) return;

            await markAllNotificationsRead(user.id);
            await this.load();
            NeuroSarathi.UI.Toasts.show('All notifications marked as read', 'success');

        } catch (error) {
            console.error('Error marking all read:', error);
            NeuroSarathi.UI.Toasts.show('Failed to mark all as read', 'error');
        }
    },

    setupSubscription: async function() {
        try {
            const user = NeuroSarathi.State.get('user');
            if (!user) return;

            if (this._state.subscription) {
                this._state.subscription.unsubscribe();
            }

            const channel = supabase
                .channel('notifications_realtime')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    const notification = payload.new;
                    const notifications = NeuroSarathi.State.get('dashboard.notifications') || [];
                    notifications.unshift(notification);
                    NeuroSarathi.State.set('dashboard.notifications', notifications);

                    this._state.unreadCount++;
                    this._updateBadge(this._state.unreadCount);

                    NeuroSarathi.UI.Toasts.show(
                        `🔔 ${notification.title}: ${notification.message}`,
                        notification.type || 'info'
                    );

                    if (this._state.isOpen) this._render(notifications);
                })
                .subscribe();

            this._state.subscription = channel;

        } catch (error) {
            console.error('Error setting up notification subscription:', error);
        }
    },

    _updateBadge: function(count) {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    _render: function(notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔔</span>
                    <div class="empty-state-title">No notifications</div>
                    <div class="empty-state-description">You're all caught up! ✨</div>
                </div>
            `;
            return;
        }

        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', reminder: '⏰' };

        list.innerHTML = notifications.slice(0, 15).map(notif => `
            <div class="notification-item ${!notif.read ? 'unread' : ''}" data-id="${notif.id}">
                <span class="icon">${icons[notif.type] || '📌'}</span>
                <div class="content">
                    <div class="title">${notif.title}</div>
                    <div class="message">${notif.message}</div>
                    <div class="time">${formatDate(notif.created_at)}</div>
                </div>
                ${!notif.read ? '<span class="unread-dot"></span>' : ''}
            </div>
        `).join('');

        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async function() {
                const id = this.dataset.id;
                const notification = notifications.find(n => n.id === id);
                if (notification && !notification.read) {
                    await NeuroSarathi.Notifications.markRead(id);
                }
                if (notification?.link && notification.link.startsWith('/')) {
                    window.location.href = notification.link;
                }
            });
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Notifications module loaded');
