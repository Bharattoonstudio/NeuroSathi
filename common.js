// ============================================================
// NEUROSARATHI V3 — common.js
// Supabase Client, Utilities, Shared Functions
// NOTE: getCurrentUser/getSession/signOut defined here are superseded
// by core/auth.js's versions of the same global names (auth.js loads
// later, so its assignments win). Kept here for utilities other than
// auth (formatDate, getAge, getInitials, etc.) which are still used
// throughout every module.
// ============================================================

const SUPABASE_URL = 'https://qvuenvngwgcknawfsnxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dWVudm5nd2dja25hd2ZzbnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzI1OTksImV4cCI6MjA5ODMwODU5OX0.MZgac469tvi9Xq9gyaRbHDc9t88Ww9dN8ldZ8JvKGVI';

// Initialize Supabase client
// FIX (from earlier audit): must be window.supabase, not window.supabaseClient
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── AUTH FUNCTIONS (superseded by core/auth.js — kept as fallback) ──

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

async function createRoutine(routineData) {
    const { data, error } = await supabase
        .from('routines')
        .insert(routineData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── OBSERVATION FUNCTIONS ──────────────────────────────────

async function createObservation(observationData) {
    const { data, error } = await supabase
        .from('observations')
        .insert(observationData)
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
        month: 'short', day: 'numeric', year: 'numeric'
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

// ─── EXPOSE ──────────────────────────────────────────────────

window.supabase = supabase;
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.signOut = signOut;
window.getProfile = getProfile;
window.updateProfile = updateProfile;
window.getChildren = getChildren;
window.createChild = createChild;
window.updateChild = updateChild;
window.deleteChild = deleteChild;
window.createRoutine = createRoutine;
window.createObservation = createObservation;
window.uploadDocument = uploadDocument;
window.getNotifications = getNotifications;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.formatDate = formatDate;
window.getTimeGreeting = getTimeGreeting;
window.getAge = getAge;
window.getInitials = getInitials;

console.log('🧠 NeuroSarathi V3 — Common Module Loaded');
