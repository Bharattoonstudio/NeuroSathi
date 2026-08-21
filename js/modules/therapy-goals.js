// ============================================================
// NEUROSARATHI V3 — modules/therapy-goals.js
// Therapy Goals Management (PHASE 1)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.TherapyGoals = {
    
    // Load all therapy goals for active child
    load: async function() {
        try {
            const activeChild = NeuroSarathi.State.get('activeChild');
            if (!activeChild) return [];

            const { data, error } = await supabase
                .from('therapy_goals')
                .select('*')
                .eq('child_id', activeChild.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            NeuroSarathi.State.set('therapyGoals', data || []);
            return data || [];
        } catch (error) {
            console.error('Error loading therapy goals:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load therapy goals', 'error');
            return [];
        }
    },

    // Create new therapy goal
    create: async function(goalData) {
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
                title: goalData.title,
                description: goalData.description,
                domain: goalData.domain,
                goal_type: goalData.goal_type || 'long_term',
                target_date: goalData.target_date,
                measurement_unit: goalData.measurement_unit,
                baseline_value: goalData.baseline_value
            };

            const { data, error } = await supabase
                .from('therapy_goals')
                .insert([payload])
                .select();

            if (error) throw error;
            
            // Reload goals
            await this.load();
            NeuroSarathi.UI.Toasts.show('Therapy goal created successfully', 'success');
            return data[0];
        } catch (error) {
            console.error('Error creating therapy goal:', error);
            NeuroSarathi.UI.Toasts.show('Failed to create therapy goal', 'error');
            return null;
        }
    },

    // Update therapy goal progress
    updateProgress: async function(goalId, progressPercent) {
        try {
            const { data, error } = await supabase
                .from('therapy_goals')
                .update({ 
                    progress_percent: progressPercent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', goalId)
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Goal progress updated', 'success');
            return data[0];
        } catch (error) {
            console.error('Error updating goal progress:', error);
            NeuroSarathi.UI.Toasts.show('Failed to update goal progress', 'error');
            return null;
        }
    },

    // Mark goal as completed
    completeGoal: async function(goalId) {
        try {
            const { data, error } = await supabase
                .from('therapy_goals')
                .update({ 
                    status: 'completed',
                    progress_percent: 100,
                    updated_at: new Date().toISOString()
                })
                .eq('id', goalId)
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Goal marked as completed! 🎉', 'success');
            return data[0];
        } catch (error) {
            console.error('Error completing goal:', error);
            NeuroSarathi.UI.Toasts.show('Failed to complete goal', 'error');
            return null;
        }
    },

    // Delete therapy goal
    delete: async function(goalId) {
        try {
            const { error } = await supabase
                .from('therapy_goals')
                .delete()
                .eq('id', goalId);

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Therapy goal deleted', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting therapy goal:', error);
            NeuroSarathi.UI.Toasts.show('Failed to delete therapy goal', 'error');
            return false;
        }
    },

    // Get goals by domain
    getByDomain: function(domain) {
        const goals = NeuroSarathi.State.get('therapyGoals') || [];
        return goals.filter(g => g.domain === domain);
    },

    // Get active goals only
    getActive: function() {
        const goals = NeuroSarathi.State.get('therapyGoals') || [];
        return goals.filter(g => g.status === 'active');
    },

    // Show add goal modal
    showAddModal: function() {
        const domains = [
            'Communication', 'Social', 'Cognitive', 
            'Fine Motor', 'Gross Motor', 'Self-Care'
        ];

        const domainOptions = domains.map(d => 
            `<option value="${d.toLowerCase().replace(/\s+/g, '_')}">${d}</option>`
        ).join('');

        NeuroSarathi.UI.Modals.create({
            id: 'addGoalModal',
            size: 'modal-lg',
            header: '🎯 Add Therapy Goal',
            body: `
                <form id="addGoalForm">
                    <div class="form-group">
                        <label class="form-label">Goal Title *</label>
                        <input type="text" class="form-control" id="goalTitleInput" 
                               placeholder="e.g., Improve speech clarity" required />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="goalDescInput" 
                                  placeholder="Detailed description of the goal" rows="3"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Domain *</label>
                            <select class="form-control form-select" id="goalDomainInput" required>
                                <option value="">Select Domain</option>
                                ${domainOptions}
                            </select>
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Goal Type</label>
                            <select class="form-control form-select" id="goalTypeInput">
                                <option value="long_term">Long-term</option>
                                <option value="short_term">Short-term</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Measurement Unit</label>
                            <input type="text" class="form-control" id="goalMeasureInput" 
                                   placeholder="e.g., words spoken, independence level" />
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Baseline Value</label>
                            <input type="text" class="form-control" id="goalBaselineInput" 
                                   placeholder="Starting point" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Target Date</label>
                        <input type="date" class="form-control" id="goalTargetDateInput" />
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveGoalBtn">Create Goal</button>
            `,
            onShow: function() {
                document.getElementById('saveGoalBtn').addEventListener('click', async function() {
                    const formData = {
                        title: document.getElementById('goalTitleInput').value,
                        description: document.getElementById('goalDescInput').value,
                        domain: document.getElementById('goalDomainInput').value,
                        goal_type: document.getElementById('goalTypeInput').value,
                        measurement_unit: document.getElementById('goalMeasureInput').value,
                        baseline_value: document.getElementById('goalBaselineInput').value,
                        target_date: document.getElementById('goalTargetDateInput').value
                    };

                    if (!formData.title || !formData.domain) {
                        NeuroSarathi.UI.Toasts.show('Please fill in required fields', 'warning');
                        return;
                    }

                    await NeuroSarathi.TherapyGoals.create(formData);
                    document.querySelector('[data-dismiss="modal"]').click();
                });
            }
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Therapy Goals module loaded');