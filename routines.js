// ============================================================
// NEUROSARATHI V3 — modules/routines.js
// Routine Management
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Routines = {
    toggle: async function(routineId) {
        try {
            const routines = NeuroSarathi.State.get('dashboard.routines') || [];
            const routine = routines.find(r => r.id === routineId);
            if (!routine) return;

            const newCompleted = !routine.completed;

            await NeuroSarathi.API.toggleRoutine(routineId, newCompleted);
            await NeuroSarathi.Dashboard.loadDashboard();

            NeuroSarathi.UI.Toasts.show(
                newCompleted ? 'Routine completed! ✅' : 'Routine reopened',
                newCompleted ? 'success' : 'info'
            );

        } catch (error) {
            console.error('Error toggling routine:', error);
            NeuroSarathi.UI.Toasts.show('Failed to update routine', 'error');
        }
    },

    createDefault: async function() {
        try {
            const childId = NeuroSarathi.State.get('activeChild.id');
            if (!childId) {
                NeuroSarathi.UI.Toasts.show('No child selected', 'error');
                return;
            }

            const defaults = NeuroSarathi.Config?.DEFAULT_ROUTINES || [
                { name: 'Wake Up', time: '07:00', order_index: 1 },
                { name: 'School', time: '09:30', order_index: 2 },
                { name: 'Activity', time: '16:00', order_index: 3 },
                { name: 'Play', time: '17:00', order_index: 4 },
                { name: 'Reading', time: '19:30', order_index: 5 },
                { name: 'Sleep', time: '21:00', order_index: 6 }
            ];

            for (const routine of defaults) {
                await createRoutine({
                    child_id: childId,
                    name: routine.name,
                    time: routine.time,
                    order_index: routine.order_index,
                    completed: false
                });
            }

            await NeuroSarathi.Dashboard.loadDashboard();
            NeuroSarathi.UI.Toasts.show('Default routines created! 📋', 'success');

        } catch (error) {
            console.error('Error creating routines:', error);
            NeuroSarathi.UI.Toasts.show('Failed to create routines', 'error');
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Routines module loaded');
