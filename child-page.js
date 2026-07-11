// ============================================================
// NEUROSARATHI V2 — child-page.js
// My Child Page Controller
// ============================================================

const childPageState = {
    user: null,
    profile: null,
    children: [],
    activeChild: null,
    activeTab: 'overview',
};

const CP_DOM = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),

    // Top bar
    childSelector: document.getElementById('childSelector'),
    childDropdown: document.getElementById('childDropdown'),
    childDropdownList: document.getElementById('childDropdownList'),
    childAvatar: document.getElementById('childAvatar'),
    childName: document.getElementById('childName'),
    childAge: document.getElementById('childAge'),

    // Profile header
    profileChildAvatar: document.getElementById('profileChildAvatar'),
    profileChildName: document.getElementById('profileChildName'),
    profileChildAge: document.getElementById('profileChildAge'),
    profileChildClass: document.getElementById('profileChildClass'),
    profileChildSchool: document.getElementById('profileChildSchool'),
    profileChildFocus: document.getElementById('profileChildFocus'),

    // Stats
    childStatActivities: document.getElementById('childStatActivities'),
    childStatObservations: document.getElementById('childStatObservations'),
    childStatDocuments: document.getElementById('childStatDocuments'),
    childStatStreak: document.getElementById('childStatStreak'),

    // Overview info
    infoDob: document.getElementById('infoDob'),
    infoGender: document.getElementById('infoGender'),
    infoSchool: document.getElementById('infoSchool'),
    infoClass: document.getElementById('infoClass'),
    infoFocusAreas: document.getElementById('infoFocusAreas'),
    infoGoals: document.getElementById('infoGoals'),

    // Tabs
    childTabs: document.getElementById('childTabs'),

    // Milestones / Support / History
    milestonesEmptyState: document.getElementById('milestonesEmptyState'),
    milestonesList: document.getElementById('milestonesList'),
    supportTeamEmptyState: document.getElementById('supportTeamEmptyState'),
    supportTeamList: document.getElementById('supportTeamList'),
    historyEmptyState: document.getElementById('historyEmptyState'),
    historyList: document.getElementById('historyList'),

    // Chat
    chatWindow: document.getElementById('chatWindow'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSend: document.getElementById('chatSend'),
    chatClose: document.getElementById('chatClose'),
    aiAvatarFloat: document.getElementById('aiAvatarFloat'),

    // Notifications
    notificationBell: document.getElementById('notificationBell'),
    notificationPanel: document.getElementById('notificationPanel'),
    notificationList: document.getElementById('notificationList'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationClose: document.getElementById('notificationClose'),
    markAllRead: document.getElementById('markAllRead'),

    // Edit child modal
    editChildBtn: document.getElementById('editChildBtn'),
    editChildModal: document.getElementById('editChildModal'),
    editChildForm: document.getElementById('editChildForm'),
    editPhotoUpload: document.getElementById('editPhotoUpload'),
    editPhotoInput: document.getElementById('editPhotoInput'),
    saveEditChildBtn: document.getElementById('saveEditChildBtn'),

    // Support member modal
    addSupportMemberBtn: document.getElementById('addSupportMemberBtn'),
    addSupportMemberModal: document.getElementById('addSupportMemberModal'),
    addSupportMemberForm: document.getElementById('addSupportMemberForm'),
    saveSupportMemberBtn: document.getElementById('saveSupportMemberBtn'),

    // Misc
    logoutBtn: document.getElementById('logoutBtn'),
    switchChildBtn: document.getElementById('switchChildBtn'),
    childAddBtn: document.getElementById('childAddBtn'),
};

// ─── INITIALIZATION ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🧠 NeuroSarathi V2 — My Child Page Initializing...');

    try {
        const { data: { user } } = await getCurrentUser();
        if (!user) {
            window.location.href = '/enterportal.html';
            return;
        }
        childPageState.user = user;

        const profile = await getProfile(user.id);
        childPageState.profile = profile;

        await loadChildrenForPage();
        setupChildPageListeners();

        if (childPageState.activeChild) {
            await loadChildPageData();
        }

        console.log('✅ My Child Page — Ready');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showToast('Failed to load child profile. Please refresh.', 'error');
    }
});

// ─── LOAD CHILDREN ───────────────────────────────────────────

async function loadChildrenForPage() {
    try {
        const children = await getChildren(childPageState.user.id);
        childPageState.children = children;

        if (children.length === 0) {
            showModal('addChildModal'); // fall back — but this page has no add modal, so show empty inline
            return;
        }

        childPageState.activeChild = children[0];
        renderChildPageSelector();
        renderChildProfile();
    } catch (error) {
        console.error('Error loading children:', error);
        showToast('Failed to load children', 'error');
    }
}

// ─── RENDER TOP BAR CHILD SELECTOR ──────────────────────────

function renderChildPageSelector() {
    const { activeChild, children } = childPageState;
    if (!activeChild) return;

    const initials = getInitials(activeChild.name);
    CP_DOM.childAvatar.innerHTML = `<span>${initials}</span>`;
    CP_DOM.childName.textContent = activeChild.name;
    CP_DOM.childAge.textContent = `${getAge(activeChild.date_of_birth)} Years`;

    CP_DOM.childDropdownList.innerHTML = '';
    children.forEach(child => {
        const item = document.createElement('div');
        item.className = `child-dropdown-item ${child.id === activeChild.id ? 'active' : ''}`;
        const childInitials = getInitials(child.name);
        item.innerHTML = `
            <div class="avatar">${childInitials}</div>
            <div class="info">
                <div class="name">${child.name}</div>
                <div class="detail">${getAge(child.date_of_birth)} Years</div>
            </div>
        `;
        item.addEventListener('click', () => switchChildOnPage(child.id));
        CP_DOM.childDropdownList.appendChild(item);
    });
}

// ─── SWITCH CHILD ────────────────────────────────────────────

async function switchChildOnPage(childId) {
    const child = childPageState.children.find(c => c.id === childId);
    if (!child) return;

    childPageState.activeChild = child;
    renderChildPageSelector();
    renderChildProfile();
    CP_DOM.childDropdown.classList.remove('open');

    await loadChildPageData();
    showToast(`Switched to ${child.name}`, 'success');
}

// ─── RENDER CHILD PROFILE HEADER + OVERVIEW ─────────────────

function renderChildProfile() {
    const child = childPageState.activeChild;
    if (!child) return;

    const initials = getInitials(child.name);
    CP_DOM.profileChildAvatar.innerHTML = `<span>${initials}</span>`;
    CP_DOM.profileChildName.textContent = child.name;
    CP_DOM.profileChildAge.textContent = `${getAge(child.date_of_birth)} Years`;
    CP_DOM.profileChildClass.textContent = child.class || 'Class not set';
    CP_DOM.profileChildSchool.textContent = child.school || 'School not set';

    const focusIcons = {
        communication: '🗣️ Communication',
        attention: '🎯 Attention',
        learning: '📚 Learning',
        social: '👥 Social',
        sensory: '🎨 Sensory',
        motor: '🏃 Motor',
        daily_living: '🧹 Daily Living',
    };

    const focus = child.learning_focus || [];
    CP_DOM.profileChildFocus.innerHTML = focus.length > 0
        ? focus.map(f => `<span class="badge badge-orange">${focusIcons[f] || f}</span>`).join('')
        : `<span class="badge badge-orange">Not set</span>`;

    // Overview tab
    CP_DOM.infoDob.textContent = child.date_of_birth ? formatDate(child.date_of_birth) : '—';
    const genderLabels = { male: 'Boy', female: 'Girl', other: 'Other' };
    CP_DOM.infoGender.textContent = genderLabels[child.gender] || 'Not specified';
    CP_DOM.infoSchool.textContent = child.school || 'Not specified';
    CP_DOM.infoClass.textContent = child.class || 'Not specified';

    CP_DOM.infoFocusAreas.innerHTML = focus.length > 0
        ? focus.map(f => `<span class="badge badge-blue">${focusIcons[f] || f}</span>`).join('')
        : `<span class="card-text">No areas of support set yet.</span>`;

    const goalLabels = {
        build_routine: 'Build Routine',
        improve_communication: 'Improve Communication',
        school_readiness: 'School Readiness',
        parent_learning: 'Parent Learning',
        behaviour_understanding: 'Behaviour Understanding',
    };
    const goals = child.goals || [];
    CP_DOM.infoGoals.innerHTML = goals.length > 0
        ? goals.map(g => `<span class="badge badge-green">${goalLabels[g] || g}</span>`).join('')
        : `<span class="card-text">No educational goals set yet.</span>`;

    document.title = `NeuroSarathi — ${child.name}`;
}

// ─── LOAD CHILD PAGE DATA (stats, milestones, support team, history) ─

async function loadChildPageData() {
    if (!childPageState.activeChild) return;
    const childId = childPageState.activeChild.id;

    try {
        // Stats
        const { count: activityCount } = await supabase
            .from('child_activities')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId);

        const { count: observationCount } = await supabase
            .from('observations')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId);

        const { count: documentCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId);

        animateCounterCP(CP_DOM.childStatActivities, activityCount || 0);
        animateCounterCP(CP_DOM.childStatObservations, observationCount || 0);
        animateCounterCP(CP_DOM.childStatDocuments, documentCount || 0);
        animateCounterCP(CP_DOM.childStatStreak, 0); // computed via routine completion elsewhere

        // Milestones
        const { data: milestones } = await supabase
            .from('growth_metrics')
            .select('*')
            .eq('child_id', childId)
            .order('recorded_at', { ascending: false })
            .limit(10);

        renderMilestones(milestones || []);

        // Support team
        const { data: supportTeam } = await supabase
            .from('support_team')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        renderSupportTeam(supportTeam || []);

        // History (recent activities + observations combined)
        const { data: recentActivities } = await supabase
            .from('child_activities')
            .select('*, activities(*)')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(10);

        renderHistory(recentActivities || []);

    } catch (error) {
        console.error('Error loading child page data:', error);
    }
}

function animateCounterCP(element, target) {
    if (!element) return;
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        element.textContent = current;
    }, 30);
}

// ─── RENDER MILESTONES ───────────────────────────────────────

function renderMilestones(milestones) {
    if (milestones.length === 0) {
        CP_DOM.milestonesEmptyState.style.display = 'block';
        CP_DOM.milestonesList.innerHTML = '';
        return;
    }
    CP_DOM.milestonesEmptyState.style.display = 'none';
    CP_DOM.milestonesList.innerHTML = milestones.map(m => `
        <div class="milestone-item fade-in">
            <span class="milestone-icon">🏆</span>
            <div>
                <div class="milestone-title">${m.metric_name || 'Growth milestone recorded'}</div>
                <div class="milestone-date">${formatDate(m.recorded_at)}</div>
            </div>
        </div>
    `).join('');
}

// ─── RENDER SUPPORT TEAM ─────────────────────────────────────

function renderSupportTeam(members) {
    if (members.length === 0) {
        CP_DOM.supportTeamEmptyState.style.display = 'block';
        CP_DOM.supportTeamList.innerHTML = '';
        return;
    }
    CP_DOM.supportTeamEmptyState.style.display = 'none';
    const roleLabels = {
        therapist: 'Therapist',
        doctor: 'Doctor / Pediatrician',
        educator: 'Educator / Teacher',
        counselor: 'Counselor',
        other: 'Support Member',
    };
    CP_DOM.supportTeamList.innerHTML = members.map(m => `
        <div class="support-team-item fade-in">
            <div class="avatar">${getInitials(m.name)}</div>
            <div class="info">
                <div class="name">${m.name}</div>
                <div class="role">${roleLabels[m.role] || m.role}</div>
                ${m.phone ? `<div class="phone">📞 ${m.phone}</div>` : ''}
            </div>
            <div class="actions">
                <button class="btn btn-ghost btn-icon" onclick="deleteSupportMember('${m.id}')" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ─── RENDER HISTORY ──────────────────────────────────────────

function renderHistory(items) {
    if (items.length === 0) {
        CP_DOM.historyEmptyState.style.display = 'block';
        CP_DOM.historyList.innerHTML = '';
        return;
    }
    CP_DOM.historyEmptyState.style.display = 'none';
    CP_DOM.historyList.innerHTML = items.map(item => {
        const activity = item.activities;
        return `
            <div class="milestone-item fade-in">
                <span class="milestone-icon">${item.completed ? '✅' : '⏳'}</span>
                <div>
                    <div class="milestone-title">${activity?.title || 'Activity'}</div>
                    <div class="milestone-date">${formatDate(item.created_at)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── DELETE SUPPORT MEMBER ───────────────────────────────────

async function deleteSupportMember(memberId) {
    try {
        const { error } = await supabase
            .from('support_team')
            .delete()
            .eq('id', memberId);
        if (error) throw error;
        showToast('Support team member removed', 'success');
        await loadChildPageData();
    } catch (error) {
        console.error('Error deleting support member:', error);
        showToast('Failed to remove member', 'error');
    }
}
window.deleteSupportMember = deleteSupportMember;

// ─── TAB SWITCHING ───────────────────────────────────────────

function setupTabs() {
    const tabs = CP_DOM.childTabs.querySelectorAll('.child-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;
            childPageState.activeTab = tabName;

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.child-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
}

// ─── EDIT CHILD MODAL ────────────────────────────────────────

function openEditChildModal() {
    const child = childPageState.activeChild;
    if (!child) return;

    document.getElementById('editChildNameInput').value = child.name || '';
    document.getElementById('editChildDobInput').value = child.date_of_birth || '';
    document.getElementById('editChildGenderInput').value = child.gender || '';
    document.getElementById('editChildSchoolInput').value = child.school || '';
    document.getElementById('editChildClassInput').value = child.class || '';

    const focus = child.learning_focus || [];
    CP_DOM.editChildModal.querySelectorAll('#editFocusCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = focus.includes(cb.value);
    });

    const goals = child.goals || [];
    CP_DOM.editChildModal.querySelectorAll('#editGoalCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = goals.includes(cb.value);
    });

    if (child.photo_url) {
        const preview = CP_DOM.editPhotoUpload.querySelector('.photo-preview');
        preview.innerHTML = `<img src="${child.photo_url}" alt="Child photo" />`;
        preview.classList.add('has-image');
    }

    showModal('editChildModal');
}

async function handleSaveEditChild() {
    const child = childPageState.activeChild;
    if (!child) return;

    const name = document.getElementById('editChildNameInput').value.trim();
    const dob = document.getElementById('editChildDobInput').value;
    const gender = document.getElementById('editChildGenderInput').value;
    const school = document.getElementById('editChildSchoolInput').value.trim();
    const classVal = document.getElementById('editChildClassInput').value.trim();

    if (!name) {
        showToast('Please enter child\'s name', 'error');
        return;
    }
    if (!dob) {
        showToast('Please select date of birth', 'error');
        return;
    }

    const learningFocus = Array.from(
        CP_DOM.editChildModal.querySelectorAll('#editFocusCheckboxes input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    const goals = Array.from(
        CP_DOM.editChildModal.querySelectorAll('#editGoalCheckboxes input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    try {
        CP_DOM.saveEditChildBtn.disabled = true;
        CP_DOM.saveEditChildBtn.textContent = 'Saving...';

        const updates = {
            name,
            date_of_birth: dob,
            gender: gender || null,
            school: school || null,
            class: classVal || null,
            learning_focus: learningFocus,
            goals: goals,
        };

        const updatedChild = await updateChild(child.id, updates);

        const photoFile = CP_DOM.editPhotoInput.files[0];
        if (photoFile) {
            const path = `${childPageState.user.id}/${child.id}/avatar.${photoFile.name.split('.').pop()}`;
            const { data } = await uploadDocument(photoFile, path);
            if (data) {
                await updateChild(child.id, { photo_url: data.path });
                updatedChild.photo_url = data.path;
            }
        }

        // Update state
        const idx = childPageState.children.findIndex(c => c.id === child.id);
        if (idx !== -1) childPageState.children[idx] = updatedChild;
        childPageState.activeChild = updatedChild;

        renderChildPageSelector();
        renderChildProfile();
        hideModal('editChildModal');
        showToast('Profile updated successfully! 🎉', 'success');

    } catch (error) {
        console.error('Error updating child:', error);
        showToast('Failed to update profile. Please try again.', 'error');
    } finally {
        CP_DOM.saveEditChildBtn.disabled = false;
        CP_DOM.saveEditChildBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

// ─── ADD SUPPORT TEAM MEMBER ──────────────────────────────────

async function handleAddSupportMember() {
    const child = childPageState.activeChild;
    if (!child) return;

    const name = document.getElementById('supportMemberNameInput').value.trim();
    const role = document.getElementById('supportMemberRoleInput').value;
    const phone = document.getElementById('supportMemberPhoneInput').value.trim();
    const notes = document.getElementById('supportMemberNotesInput').value.trim();

    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }
    if (!role) {
        showToast('Please select a role', 'error');
        return;
    }

    try {
        CP_DOM.saveSupportMemberBtn.disabled = true;
        CP_DOM.saveSupportMemberBtn.textContent = 'Saving...';

        const { data, error } = await supabase
            .from('support_team')
            .insert({
                child_id: child.id,
                name,
                role,
                phone: phone || null,
                notes: notes || null,
            })
            .select()
            .single();

        if (error) throw error;

        hideModal('addSupportMemberModal');
        showToast(`${name} added to support team! 🤝`, 'success');
        document.getElementById('addSupportMemberForm').reset();

        await loadChildPageData();

    } catch (error) {
        console.error('Error adding support member:', error);
        showToast('Failed to add support team member', 'error');
    } finally {
        CP_DOM.saveSupportMemberBtn.disabled = false;
        CP_DOM.saveSupportMemberBtn.innerHTML = '<i class="fas fa-save"></i> Add Member';
    }
}

// ─── SETUP EVENT LISTENERS ───────────────────────────────────

function setupChildPageListeners() {
    // Sidebar
    CP_DOM.hamburgerBtn.addEventListener('click', () => {
        CP_DOM.sidebar.classList.toggle('open');
        CP_DOM.sidebarOverlay.classList.toggle('active');
        document.body.style.overflow = CP_DOM.sidebar.classList.contains('open') ? 'hidden' : '';
    });
    CP_DOM.sidebarOverlay.addEventListener('click', () => {
        CP_DOM.sidebar.classList.remove('open');
        CP_DOM.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Child selector
    CP_DOM.childSelector.addEventListener('click', function (e) {
        e.stopPropagation();
        CP_DOM.childDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
        if (!CP_DOM.childSelector.contains(e.target) && !CP_DOM.childDropdown.contains(e.target)) {
            CP_DOM.childDropdown.classList.remove('open');
        }
    });
    CP_DOM.childAddBtn.addEventListener('click', () => {
        CP_DOM.childDropdown.classList.remove('open');
        window.location.href = 'dashboard.html';
    });
    CP_DOM.switchChildBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        CP_DOM.childDropdown.classList.toggle('open');
    });

    // Tabs
    setupTabs();

    // Edit child
    CP_DOM.editChildBtn.addEventListener('click', openEditChildModal);
    CP_DOM.saveEditChildBtn.addEventListener('click', handleSaveEditChild);
    CP_DOM.editPhotoUpload.addEventListener('click', () => CP_DOM.editPhotoInput.click());
    CP_DOM.editPhotoInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            const preview = CP_DOM.editPhotoUpload.querySelector('.photo-preview');
            preview.innerHTML = `<img src="${event.target.result}" alt="Child photo" />`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    });

    // Support team
    CP_DOM.addSupportMemberBtn.addEventListener('click', () => showModal('addSupportMemberModal'));
    CP_DOM.saveSupportMemberBtn.addEventListener('click', handleAddSupportMember);

    // Chat
    CP_DOM.aiAvatarFloat.addEventListener('click', toggleChildPageChat);
    CP_DOM.chatClose.addEventListener('click', toggleChildPageChat);
    CP_DOM.chatSend.addEventListener('click', sendChildPageChatMessage);
    CP_DOM.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChildPageChatMessage();
    });
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            CP_DOM.chatInput.value = this.dataset.prompt;
            sendChildPageChatMessage();
        });
    });

    // Notifications
    CP_DOM.notificationBell.addEventListener('click', toggleChildPageNotifications);
    CP_DOM.notificationClose.addEventListener('click', toggleChildPageNotifications);
    CP_DOM.markAllRead.addEventListener('click', async () => {
        try {
            await markAllNotificationsRead(childPageState.user.id);
            await loadChildPageNotifications();
            showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    });

    // Logout
    CP_DOM.logoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        try {
            await signOut();
            window.location.href = '/enterportal.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    });
}

// ─── CHAT (page-local) ────────────────────────────────────────

function toggleChildPageChat() {
    CP_DOM.chatWindow.classList.toggle('open');
    if (CP_DOM.chatWindow.classList.contains('open')) {
        CP_DOM.chatInput.focus();
    }
}

async function sendChildPageChatMessage() {
    const message = CP_DOM.chatInput.value.trim();
    if (!message) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.textContent = message;
    CP_DOM.chatMessages.appendChild(userMsg);
    CP_DOM.chatInput.value = '';
    CP_DOM.chatMessages.scrollTop = CP_DOM.chatMessages.scrollHeight;

    const typing = document.createElement('div');
    typing.className = 'chat-message ai';
    typing.textContent = '✍️ typing...';
    CP_DOM.chatMessages.appendChild(typing);
    CP_DOM.chatMessages.scrollTop = CP_DOM.chatMessages.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                childId: childPageState.activeChild?.id,
            }),
        });
        const data = await response.json();
        typing.textContent = data.response || 'I\'m here to help!';
    } catch (error) {
        typing.textContent = 'Sorry, I\'m having trouble connecting. Please try again.';
        console.error('Chat error:', error);
    }
    CP_DOM.chatMessages.scrollTop = CP_DOM.chatMessages.scrollHeight;
}

// ─── NOTIFICATIONS (page-local) ───────────────────────────────

function toggleChildPageNotifications() {
    CP_DOM.notificationPanel.classList.toggle('open');
    if (CP_DOM.notificationPanel.classList.contains('open')) {
        loadChildPageNotifications();
    }
}

async function loadChildPageNotifications() {
    try {
        const notifications = await getNotifications(childPageState.user.id);
        renderChildPageNotifications(notifications);

        const unreadCount = notifications.filter(n => !n.read).length;
        CP_DOM.notificationBadge.textContent = unreadCount;
        CP_DOM.notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderChildPageNotifications(notifications) {
    CP_DOM.notificationList.innerHTML = '';

    if (notifications.length === 0) {
        CP_DOM.notificationList.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🔔</span>
                <div class="empty-state-title">No notifications</div>
                <div class="empty-state-description">You're all caught up!</div>
            </div>
        `;
        return;
    }

    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', reminder: '⏰' };

    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
        item.innerHTML = `
            <span class="icon">${icons[notif.type] || '📌'}</span>
            <div class="content">
                <div class="title">${notif.title}</div>
                <div class="message">${notif.message}</div>
                <div class="time">${formatDate(notif.created_at)}</div>
            </div>
        `;
        item.addEventListener('click', async () => {
            if (!notif.read) {
                await markNotificationRead(notif.id);
                await loadChildPageNotifications();
            }
            if (notif.link) window.location.href = notif.link;
        });
        CP_DOM.notificationList.appendChild(item);
    });
}

console.log('🧠 NeuroSarathi V2 — My Child Page Controller Loaded');
