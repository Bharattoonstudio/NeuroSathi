// ============================================================
// NEUROSARATHI V3 — modules/therapy-plans.js
// Therapy Plans Management (PHASE 1)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.TherapyPlans = {

    // Load all therapy plans for active child
    load: async function() {
        try {
            const activeChild = NeuroSarathi.State.get('activeChild');
            if (!activeChild) return [];

            const { data, error } = await supabase
                .from('therapy_plans')
                .select('*')
                .eq('child_id', activeChild.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            NeuroSarathi.State.set('therapyPlans', data || []);
            return data || [];
        } catch (error) {
            console.error('Error loading therapy plans:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load therapy plans', 'error');
            return [];
        }
    },

    // Create new therapy plan
    create: async function(planData) {
        try {
            const user = NeuroSarathi.State.get('user');
            const activeChild = NeuroSarathi.State.get('activeChild');

            if (!user || !activeChild) {
                NeuroSarathi.UI.Toasts.show('Please select a child first', 'warning');
                return null;
            }

            const payload = {
                child_id: activeChild.id,
                parent_id: user.id,
                therapy_type: planData.therapy_type,
                title: planData.title,
                description: planData.description,
                frequency: planData.frequency,
                session_duration_minutes: planData.session_duration_minutes,
                start_date: planData.start_date,
                end_date: planData.end_date,
                assigned_therapist_name: planData.assigned_therapist_name
            };

            const { data, error } = await supabase
                .from('therapy_plans')
                .insert([payload])
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Therapy plan created successfully', 'success');
            return data[0];
        } catch (error) {
            console.error('Error creating therapy plan:', error);
            NeuroSarathi.UI.Toasts.show('Failed to create therapy plan', 'error');
            return null;
        }
    },

    // Link goal to therapy plan
    addGoalToplan: async function(therapyPlanId, goalId) {
        try {
            const { data, error } = await supabase
                .from('therapy_plan_goals')
                .insert([{
                    therapy_plan_id: therapyPlanId,
                    goal_id: goalId
                }])
                .select();

            if (error) throw error;
            NeuroSarathi.UI.Toasts.show('Goal linked to therapy plan', 'success');
            return data[0];
        } catch (error) {
            console.error('Error linking goal to plan:', error);
            NeuroSarathi.UI.Toasts.show('Failed to link goal to plan', 'error');
            return null;
        }
    },

    // Get goals for specific therapy plan
    getGoalsForPlan: async function(therapyPlanId) {
        try {
            const { data, error } = await supabase
                .from('therapy_plan_goals')
                .select('goal_id, therapy_goals(*)')
                .eq('therapy_plan_id', therapyPlanId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching plan goals:', error);
            return [];
        }
    },

    // Update therapy plan
    update: async function(planId, updates) {
        try {
            const { data, error } = await supabase
                .from('therapy_plans')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', planId)
                .select();

            if (error) throw error;
            await this.load();
            NeuroSarathi.UI.Toasts.show('Therapy plan updated', 'success');
            return data[0];
        } catch (error) {
            console.error('Error updating therapy plan:', error);
            NeuroSarathi.UI.Toasts.show('Failed to update therapy plan', 'error');
            return null;
        }
    },

    // Pause therapy plan
    pausePlan: async function(planId) {
        return this.update(planId, { status: 'paused' });
    },

    // Resume therapy plan
    resumePlan: async function(planId) {
        return this.update(planId, { status: 'active' });
    },

    // Complete therapy plan
    completePlan: async function(planId) {
        return this.update(planId, { status: 'completed' });
    },

    // Delete therapy plan
    delete: async function(planId) {
        try {
            const { error } = await supabase
                .from('therapy_plans')
                .delete()
                .eq('id', planId);

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Therapy plan deleted', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting therapy plan:', error);
            NeuroSarathi.UI.Toasts.show('Failed to delete therapy plan', 'error');
            return false;
        }
    },

    // Get plans by therapy type
    getByType: function(therapyType) {
        const plans = NeuroSarathi.State.get('therapyPlans') || [];
        return plans.filter(p => p.therapy_type === therapyType);
    },

    // Get active plans
    getActive: function() {
        const plans = NeuroSarathi.State.get('therapyPlans') || [];
        return plans.filter(p => p.status === 'active');
    },

    // Show add plan modal
    showAddModal: function() {
        const therapyTypes = [
            'Speech Therapy',
            'Occupational Therapy',
            'Physical Therapy',
            'Behavioral Support',
            'Special Education'
        ];

        const typeOptions = therapyTypes.map(t => 
            `<option value="${t.toLowerCase().replace(/\s+/g, '_')}">${t}</option>`
        ).join('');

        NeuroSarathi.UI.Modals.create({
            id: 'addPlanModal',
            size: 'modal-lg',
            header: '📋 Create Therapy Plan',
            body: `
                <form id="addPlanForm">
                    <div class="form-group">
                        <label class="form-label">Therapy Type *</label>
                        <select class="form-control form-select" id="planTypeInput" required>
                            <option value="">Select Therapy Type</option>
                            ${typeOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Plan Title *</label>
                        <input type="text" class="form-control" id="planTitleInput" 
                               placeholder="e.g., Speech Therapy - Spring 2024" required />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="planDescInput" 
                                  placeholder="Plan details and approach" rows="3"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Frequency *</label>
                            <select class="form-control form-select" id="planFrequencyInput" required>
                                <option value="">Select Frequency</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="twice_weekly">Twice Weekly</option>
                                <option value="bi_weekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Session Duration (minutes)</label>
                            <input type="number" class="form-control" id="planDurationInput" 
                                   placeholder="e.g., 60" min="15" max="180" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Start Date *</label>
                            <input type="date" class="form-control" id="planStartDateInput" required />
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">End Date</label>
                            <input type="date" class="form-control" id="planEndDateInput" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Therapist Name</label>
                        <input type="text" class="form-control" id="planTherapistInput" 
                               placeholder="Therapist's name" />
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="savePlanBtn">Create Plan</button>
            `,
            onShow: function() {
                document.getElementById('savePlanBtn').addEventListener('click', async function() {
                    const formData = {
                        therapy_type: document.getElementById('planTypeInput').value,
                        title: document.getElementById('planTitleInput').value,
                        description: document.getElementById('planDescInput').value,
                        frequency: document.getElementById('planFrequencyInput').value,
                        session_duration_minutes: parseInt(document.getElementById('planDurationInput').value) || 60,
                        start_date: document.getElementById('planStartDateInput').value,
                        end_date: document.getElementById('planEndDateInput').value,
                        assigned_therapist_name: document.getElementById('planTherapistInput').value
                    };

                    if (!formData.therapy_type || !formData.title || !formData.frequency || !formData.start_date) {
                        NeuroSarathi.UI.Toasts.show('Please fill in required fields', 'warning');
                        return;
                    }

                    await NeuroSarathi.TherapyPlans.create(formData);
                    document.querySelector('[data-dismiss="modal"]').click();
                });
            }
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Therapy Plans module loaded');