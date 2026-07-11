// ============================================================
// NEUROSARATHI V2 — common.js
// Supabase Client, Utilities, Shared Functions
// ============================================================

// ─── SUPABASE CLIENT ──────────────────────────────────────────

const SUPABASE_URL = 'https://qvuenvngwgcknawfsnxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVudm5nd2dja25hd2ZzbnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzI1OTksImV4cCI6MjA5ODMwODU5OX0.MZgac469tvi9Xq9gyaRbHDc9t88Ww9dN8ldZ8JvKGVI';

// Initialize Supabase client
// FIX: was `supabaseClient.createClient(...)` — `supabaseClient` was never
// defined anywhere. The CDN script exposes the library as `window.supabase`,
// not `window.supabaseClient` (confirmed by enterportal.html/signup.html,
// which both correctly use `window.supabase.createClient`). This line threw
// a ReferenceError on every page load, before dashboard.js ever ran and
// before any event listener got attached — which is why every link and
// button on the dashboard appeared dead.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── AUTH FUNCTIONS ──────────────────────────────────────────

function getCurrentUser() {
    return supabase.auth.getUser();
}

function getSession() {
    return supabase.auth.getSession();
}

function signOut() {
    return supabase.auth.signOut();
}

// ─── PROFILE FUNCTIONS ──────────────────────────────────────

async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── CHILD FUNCTIONS ────────────────────────────────────────

async function getChildren(parentId) {
    const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

async function getChild(childId) {
    const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single();
    if (error) throw error;
    return data;
}

async function createChild(childData) {
    const { data, error } = await supabase
        .from('children')
        .insert(childData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateChild(childId, updates) {
    const { data, error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteChild(childId) {
    const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);
    if (error) throw error;
    return true;
}

// ─── ROUTINE FUNCTIONS ──────────────────────────────────────

async function getRoutines(childId) {
    const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('child_id', childId)
        .order('order_index', { ascending: true });
    if (error) throw error;
    return data;
}

async function createRoutine(routineData) {
    const { data, error } = await supabase
        .from('routines')
        .insert(routineData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateRoutine(routineId, updates) {
    const { data, error } = await supabase
        .from('routines')
        .update(updates)
        .eq('id', routineId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteRoutine(routineId) {
    const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);
    if (error) throw error;
    return true;
}

// ─── OBSERVATION FUNCTIONS ──────────────────────────────────

async function getObservations(childId, limit = 10) {
    const { data, error } = await supabase
        .from('observations')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

async function createObservation(observationData) {
    const { data, error } = await supabase
        .from('observations')
        .insert(observationData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── ACTIVITY FUNCTIONS ─────────────────────────────────────

async function getActivities(filters = {}) {
    let query = supabase.from('activities').select('*');

    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.age) {
        query = query.lte('age_min', filters.age).gte('age_max', filters.age);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function getChildActivities(childId) {
    const { data, error } = await supabase
        .from('child_activities')
        .select('*, activities(*)')
        .eq('child_id', childId)
        .order('scheduled_date', { ascending: false });
    if (error) throw error;
    return data;
}

async function createChildActivity(childActivityData) {
    const { data, error } = await supabase
        .from('child_activities')
        .insert(childActivityData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateChildActivity(activityId, updates) {
    const { data, error } = await supabase
        .from('child_activities')
        .update(updates)
        .eq('id', activityId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── GROWTH METRIC FUNCTIONS ────────────────────────────────

async function getGrowthMetrics(childId) {
    const { data, error } = await supabase
        .from('growth_metrics')
        .select('*')
        .eq('child_id', childId)
        .order('recorded_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function createGrowthMetric(metricData) {
    const { data, error } = await supabase
        .from('growth_metrics')
        .insert(metricData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── PROFESSIONAL FUNCTIONS ─────────────────────────────────

async function getProfessionals(filters = {}) {
    let query = supabase.from('professionals').select('*');

    if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.specialization) {
        query = query.contains('specialization', [filters.specialization]);
    }
    if (filters.verified) {
        query = query.eq('verified', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function createEnquiry(enquiryData) {
    const { data, error } = await supabase
        .from('professional_enquiries')
        .insert(enquiryData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── DOCUMENT FUNCTIONS ─────────────────────────────────────

async function uploadDocument(file, path) {
    const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file);
    if (error) throw error;
    return data;
}

async function getDocuments(parentId, childId = null) {
    let query = supabase
        .from('documents')
        .select('*')
        .eq('parent_id', parentId);

    if (childId) {
        query = query.eq('child_id', childId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function deleteDocument(documentId) {
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
    if (error) throw error;
    return true;
}

// ─── NOTIFICATION FUNCTIONS ──────────────────────────────────

async function getNotifications(userId, limit = 20) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

async function markNotificationRead(notificationId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    if (error) throw error;
    return true;
}

async function markAllNotificationsRead(userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);
    if (error) throw error;
    return true;
}

// ─── UTILITY FUNCTIONS ──────────────────────────────────────

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

function getAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── TOAST NOTIFICATION SYSTEM ──────────────────────────────

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ─── MODAL SYSTEM ────────────────────────────────────────────

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
}

function createModal(options) {
    const modal = document.createElement('div');
    modal.id = options.id || `modal-${generateId()}`;
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('${modal.id}')"></div>
        <div class="modal-content ${options.size || 'modal-md'}">
            ${options.header ? `<div class="modal-header">${options.header}</div>` : ''}
            <div class="modal-body">${options.body || ''}</div>
            ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            <button class="modal-close" onclick="hideModal('${modal.id}')">×</button>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// ─── LOADING SKELETON ──────────────────────────────────────

function showSkeleton(containerId, count = 3, type = 'card') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton-${type}`;
        skeleton.innerHTML = `
            <div class="skeleton-img shimmer"></div>
            <div class="skeleton-line shimmer"></div>
            <div class="skeleton-line shimmer" style="width:70%"></div>
            <div class="skeleton-line shimmer" style="width:50%"></div>
        `;
        container.appendChild(skeleton);
    }
}

function hideSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// ─── EXPOSE MODULES ──────────────────────────────────────────

window.supabase = supabase;
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.signOut = signOut;
window.getProfile = getProfile;
window.updateProfile = updateProfile;
window.getChildren = getChildren;
window.getChild = getChild;
window.createChild = createChild;
window.updateChild = updateChild;
window.deleteChild = deleteChild;
window.getRoutines = getRoutines;
window.createRoutine = createRoutine;
window.updateRoutine = updateRoutine;
window.deleteRoutine = deleteRoutine;
window.getObservations = getObservations;
window.createObservation = createObservation;
window.getActivities = getActivities;
window.getChildActivities = getChildActivities;
window.createChildActivity = createChildActivity;
window.updateChildActivity = updateChildActivity;
window.getGrowthMetrics = getGrowthMetrics;
window.createGrowthMetric = createGrowthMetric;
window.getProfessionals = getProfessionals;
window.createEnquiry = createEnquiry;
window.uploadDocument = uploadDocument;
window.getDocuments = getDocuments;
window.deleteDocument = deleteDocument;
window.getNotifications = getNotifications;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.getTimeGreeting = getTimeGreeting;
window.getAge = getAge;
window.getInitials = getInitials;
window.generateId = generateId;
window.showToast = showToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.createModal = createModal;
window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;

console.log('🧠 NeuroSarathi V2 — Common Module Loaded');
