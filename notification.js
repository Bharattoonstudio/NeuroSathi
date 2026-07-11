// ============================================================
// NEUROSARATHI V2 — notification.js
// Notification Module
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const notificationState = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    subscription: null
};

// ─── LOAD NOTIFICATIONS ──────────────────────────────────────

async function loadNotifications() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const notifications = await getNotifications(user.id);
        notificationState.notifications = notifications;
        notificationState.unreadCount = notifications.filter(n => !n.read).length;

        renderNotifications(notifications);
        updateNotificationBadge(notificationState.unreadCount);

        return notifications;

    } catch (error) {
        console.error('Error loading notifications:', error);
        return [];
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notificationList');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🔔</span>
                <div class="empty-state-title">No notifications</div>
                <div class="empty-state-description">You're all caught up! ✨</div>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    notifications.forEach(notif => {
        const item = createNotificationItem(notif);
        list.appendChild(item);
    });
}

function createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = `notification-item ${!notification.read ? 'unread' : ''} fade-in`;
    item.dataset.id = notification.id;

    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', reminder: '⏰' };

    item.innerHTML = `
        <span class="icon">${icons[notification.type] || '📌'}</span>
        <div class="content">
            <div class="title">${notification.title}</div>
            <div class="message">${notification.message}</div>
            <div class="time">${formatDate(notification.created_at)}</div>
        </div>
        ${!notification.read ? '<span class="unread-dot"></span>' : ''}
    `;

    item.addEventListener('click', () => handleNotificationClick(notification));

    return item;
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ─── NOTIFICATION ACTIONS ────────────────────────────────────

async function handleNotificationClick(notification) {
    try {
        if (!notification.read) {
            await markNotificationRead(notification.id);
            notification.read = true;
            notificationState.unreadCount--;
            updateNotificationBadge(notificationState.unreadCount);

            const item = document.querySelector(`.notification-item[data-id="${notification.id}"]`);
            if (item) {
                item.classList.remove('unread');
                item.querySelector('.unread-dot')?.remove();
            }
        }

        if (notification.link) {
            if (notification.link.startsWith('/')) {
                window.location.href = notification.link;
            } else if (notification.link.startsWith('http')) {
                window.open(notification.link, '_blank');
            }
        }

    } catch (error) {
        console.error('Error handling notification:', error);
    }
}

/**
 * Mark all notifications as read.
 * NOTE: named markAllNotificationsReadHandler (not markAllNotificationsRead)
 * because common.js already exports a lower-level markAllNotificationsRead(userId)
 * that hits Supabase directly. Naming this the same would have caused this
 * function to call itself instead of common.js's version — an infinite
 * recursion bug. window.markAllNotificationsRead is aliased to this handler
 * below, which is what dashboard.html's button actually calls.
 */
async function markAllNotificationsReadHandler() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await markAllNotificationsRead(user.id);

        notificationState.notifications.forEach(n => n.read = true);
        notificationState.unreadCount = 0;
        updateNotificationBadge(0);

        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.querySelector('.unread-dot')?.remove();
        });

        showToast('All notifications marked as read', 'success');

    } catch (error) {
        console.error('Error marking all read:', error);
        showToast('Failed to mark all as read', 'error');
    }
}

// ─── NOTIFICATION PANEL ──────────────────────────────────────

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    notificationState.isOpen = !notificationState.isOpen;
    panel.classList.toggle('open');

    if (notificationState.isOpen) {
        loadNotifications();
    }
}

function closeNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('open');
        notificationState.isOpen = false;
    }
}

// ─── REALTIME SUBSCRIPTIONS ──────────────────────────────────

/**
 * Setup realtime notification subscription.
 * FIX: original was missing `async` despite using `await` inside —
 * that throws a SyntaxError and breaks the entire file on load.
 */
async function setupNotificationSubscription() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (notificationState.subscription) {
            notificationState.subscription.unsubscribe();
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
                notificationState.notifications.unshift(notification);
                notificationState.unreadCount++;
                updateNotificationBadge(notificationState.unreadCount);

                showNotificationToast(notification);

                if (notificationState.isOpen) {
                    renderNotifications(notificationState.notifications);
                }
            })
            .subscribe();

        notificationState.subscription = channel;

    } catch (error) {
        console.error('Error setting up notification subscription:', error);
    }
}

function showNotificationToast(notification) {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', reminder: '⏰' };
    showToast(`${icons[notification.type] || '📌'} ${notification.title}: ${notification.message}`, notification.type || 'info');
}

async function createNotification(userId, title, message, type = 'info', link = null) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({ user_id: userId, title, message, type, link, read: false })
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && notificationState.isOpen) {
        closeNotifications();
    }
});

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.loadNotifications = loadNotifications;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.markAllNotificationsRead = markAllNotificationsReadHandler;
window.setupNotificationSubscription = setupNotificationSubscription;
window.createNotification = createNotification;

console.log('🧠 NeuroSarathi V2 — Notification Module Loaded');
