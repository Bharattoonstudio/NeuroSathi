// ============================================================
// NEUROSARATHI V3 — core/config.js
// Configuration & Constants
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Config = {
    DEFAULT_ROUTINES: [
        { name: 'Wake Up', time: '07:00', emoji: '🌅', order_index: 1 },
        { name: 'School', time: '09:30', emoji: '🏫', order_index: 2 },
        { name: 'Activity', time: '16:00', emoji: '🎯', order_index: 3 },
        { name: 'Play', time: '17:00', emoji: '🎨', order_index: 4 },
        { name: 'Reading', time: '19:30', emoji: '📖', order_index: 5 },
        { name: 'Sleep', time: '21:00', emoji: '🌙', order_index: 6 }
    ],

    XP: {
        ACTIVITY_COMPLETE: 10,
        OBSERVATION_SAVE: 5,
        DOCUMENT_UPLOAD: 3,
        ROUTINE_COMPLETE: 2,
        JOURNAL_ENTRY: 3,
        STREAK_BONUS: 5
    },

    BADGES: [
        { id: 'first_activity', icon: '🌟', label: 'First Activity', requirement: { activities: 1 } },
        { id: 'first_observation', icon: '📝', label: 'First Observation', requirement: { observations: 1 } },
        { id: 'first_document', icon: '📚', label: 'First Read', requirement: { documents: 1 } },
        { id: 'streak_3', icon: '🔥', label: '3 Day Streak', requirement: { streak: 3 } },
        { id: 'streak_7', icon: '🔥🔥', label: '7 Day Streak', requirement: { streak: 7 } },
        { id: 'activity_master', icon: '🎯', label: 'Activity Master', requirement: { activities: 10 } },
        { id: 'observer', icon: '👁️', label: 'Observer', requirement: { observations: 5 } }
    ],

    LEVELS: [
        { level: 1, xp_required: 0 }, { level: 2, xp_required: 100 },
        { level: 3, xp_required: 250 }, { level: 4, xp_required: 500 },
        { level: 5, xp_required: 1000 }, { level: 6, xp_required: 2000 },
        { level: 7, xp_required: 3500 }, { level: 8, xp_required: 5000 },
        { level: 9, xp_required: 7500 }, { level: 10, xp_required: 10000 }
    ],

    FEED_TYPES: {
        activity: { icon: '🎯', label: 'Activity' },
        observation: { icon: '💭', label: 'Observation' },
        milestone: { icon: '🏆', label: 'Milestone' },
        tip: { icon: '💡', label: 'Tip' },
        resource: { icon: '📚', label: 'Resource' },
        scheme: { icon: '🏛️', label: 'Government Scheme' },
        community: { icon: '👨‍👩‍👧‍👦', label: 'Community' },
        routine: { icon: '📋', label: 'Routine' },
        journal: { icon: '📖', label: 'Journal' }
    },

    FOCUS_LABELS: {
        communication: '🗣️ Communication',
        social: '👥 Social Skills',
        attention: '🎯 Attention',
        learning: '📚 Learning',
        sensory: '🎨 Sensory',
        motor: '🏃 Motor Skills',
        daily_living: '🧹 Daily Living'
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Config module loaded');
