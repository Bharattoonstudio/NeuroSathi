// ============================================================
// NEUROSARATHI V3 — modules/milestones.js
// Developmental Milestones Tracking (PHASE 1)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Milestones = {

    // Standard developmental milestones database
    STANDARD_MILESTONES: {
        communication: [
            { name: 'Makes sounds', age_months: 2 },
            { name: 'Babbles', age_months: 4 },
            { name: 'Says first word', age_months: 12 },
            { name: 'Understands simple words', age_months: 10 },
            { name: 'Points to objects', age_months: 12 },
            { name: 'Says 50 words', age_months: 24 },
            { name: 'Uses simple sentences', age_months: 24 },
            { name: 'Engages in conversation', age_months: 36 }
        ],
        social: [
            { name: 'Smiles socially', age_months: 2 },
            { name: 'Interacts with caregivers', age_months: 4 },
            { name: 'Shows interest in playing', age_months: 6 },
            { name: 'Waves goodbye', age_months: 9 },
            { name: 'Plays peek-a-boo', age_months: 9 },
            { name: 'Shows empathy', age_months: 24 },
            { name: 'Engages in group play', age_months: 36 },
            { name: 'Takes turns', age_months: 36 }
        ],
        cognitive: [
            { name: 'Tracks objects with eyes', age_months: 2 },
            { name: 'Recognizes caregivers', age_months: 3 },
            { name: 'Reaches for objects', age_months: 4 },
            { name: 'Object permanence develops', age_months: 8 },
            { name: 'Understands cause and effect', age_months: 12 },
            { name: 'Solves simple problems', age_months: 18 },
            { name: 'Counts to 10', age_months: 24 },
            { name: 'Identifies colors', age_months: 36 }
        ],
        motor_fine: [
            { name: 'Grasps rattle', age_months: 3 },
            { name: 'Transfers objects hand to hand', age_months: 6 },
            { name: 'Pincer grasp develops', age_months: 9 },
            { name: 'Begins feeding self', age_months: 12 },
            { name: 'Scribbles intentionally', age_months: 12 },
            { name: 'Turns pages of book', age_months: 18 },
            { name: 'Uses spoon/fork', age_months: 24 },
            { name: 'Draws circles', age_months: 36 }
        ],
        motor_gross: [
            { name: 'Lifts head', age_months: 1 },
            { name: 'Rolls over', age_months: 4 },
            { name: 'Sits with support', age_months: 4 },
            { name: 'Sits independently', age_months: 6 },
            { name: 'Crawls', age_months: 8 },
            { name: 'Stands with support', age_months: 9 },
            { name: 'Walks independently', age_months: 12 },
            { name: 'Runs', age_months: 18 }
        ],
        self_care: [
            { name: 'Shows hunger/fullness cues', age_months: 3 },
            { name: 'Drinks from cup with help', age_months: 6 },
            { name: 'Begins showing toilet awareness', age_months: 18 },
            { name: 'Drinks from cup independently', age_months: 18 },
            { name: 'Shows readiness for potty training', age_months: 24 },
            { name: 'Eats with utensils', age_months: 24 },
            { name: 'Washes hands with help', age_months: 30 },
            { name: 'Dresses self with help', age_months: 36 }
        ]
    },

    // Load milestones for active child
    load: async function() {
        try {
            const activeChild = NeuroSarathi.State.get('activeChild');
            if (!activeChild) return [];

            const { data, error } = await supabase
                .from('developmental_milestones')
                .select('*')
                .eq('child_id', activeChild.id)
                .order('age_months_expected', { ascending: true });

            if (error) throw error;
            NeuroSarathi.State.set('milestones', data || []);
            return data || [];
        } catch (error) {
            console.error('Error loading milestones:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load milestones', 'error');
            return [];
        }
    },

    // Record milestone achievement
    recordMilestone: async function(milestoneData) {
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
                milestone_name: milestoneData.name,
                domain: milestoneData.domain,
                age_months_expected: milestoneData.age_months_expected,
                age_months_achieved: milestoneData.age_months_achieved,
                description: milestoneData.description,
                achieved_date: milestoneData.achieved_date,
                evidence_notes: milestoneData.evidence_notes,
                status: 'achieved'
            };

            const { data, error } = await supabase
                .from('developmental_milestones')
                .insert([payload])
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show(`Milestone recorded: ${milestoneData.name} 🎉`, 'success');
            return data[0];
        } catch (error) {
            console.error('Error recording milestone:', error);
            NeuroSarathi.UI.Toasts.show('Failed to record milestone', 'error');
            return null;
        }
    },

    // Check milestone status
    checkMilestoneStatus: async function(milestoneId) {
        try {
            const { data, error } = await supabase
                .from('developmental_milestones')
                .select('*')
                .eq('id', milestoneId);

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error checking milestone:', error);
            return null;
        }
    },

    // Get child's current age in months
    getChildAgeMonths: function() {
        const activeChild = NeuroSarathi.State.get('activeChild');
        if (!activeChild || !activeChild.date_of_birth) return 0;

        const birthDate = new Date(activeChild.date_of_birth);
        const today = new Date();
        const months = (today.getFullYear() - birthDate.getFullYear()) * 12 +
                      (today.getMonth() - birthDate.getMonth());
        return Math.max(0, months);
    },

    // Get milestones by status
    getByStatus: function(status) {
        const milestones = NeuroSarathi.State.get('milestones') || [];
        return milestones.filter(m => m.status === status);
    },

    // Get achieved milestones
    getAchieved: function() {
        return this.getByStatus('achieved');
    },

    // Get pending milestones for age
    getPendingForAge: function() {
        const currentAgeMonths = this.getChildAgeMonths();
        const milestones = NeuroSarathi.State.get('milestones') || [];
        
        return milestones.filter(m => 
            m.status === 'pending' && 
            m.age_months_expected <= currentAgeMonths + 6  // Show next 6 months
        );
    },

    // Get delayed milestones
    getDelayed: function() {
        const currentAgeMonths = this.getChildAgeMonths();
        const milestones = NeuroSarathi.State.get('milestones') || [];
        
        return milestones.filter(m => 
            m.status !== 'achieved' && 
            m.age_months_expected + 6 < currentAgeMonths  // More than 6 months behind
        );
    },

    // Calculate developmental progress by domain
    getProgressByDomain: function() {
        const achieved = this.getAchieved();
        const progress = {};

        const domains = ['communication', 'social', 'cognitive', 'motor_fine', 'motor_gross', 'self_care'];
        
        domains.forEach(domain => {
            const totalForDomain = this.STANDARD_MILESTONES[domain].length;
            const achievedForDomain = achieved.filter(m => m.domain === domain).length;
            progress[domain] = {
                achieved: achievedForDomain,
                total: totalForDomain,
                percentage: Math.round((achievedForDomain / totalForDomain) * 100)
            };
        });

        return progress;
    },

    // Show add milestone modal
    showAddModal: function() {
        const domains = [
            'Communication', 'Social', 'Cognitive',
            'Fine Motor', 'Gross Motor', 'Self-Care'
        ];

        const domainOptions = domains.map(d => 
            `<option value="${d.toLowerCase().replace(/\s+/g, '_')}">${d}</option>`
        ).join('');

        const currentAgeMonths = this.getChildAgeMonths();

        NeuroSarathi.UI.Modals.create({
            id: 'addMilestoneModal',
            size: 'modal-lg',
            header: '🌟 Record Milestone Achievement',
            body: `
                <form id="addMilestoneForm">
                    <div class="form-group">
                        <label class="form-label">Milestone Name *</label>
                        <input type="text" class="form-control" id="milestonNameInput" 
                               placeholder="e.g., Said first word" required />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Domain *</label>
                        <select class="form-control form-select" id="milestoneDomainInput" required>
                            <option value="">Select Domain</option>
                            ${domainOptions}
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Expected Age (months)</label>
                            <input type="number" class="form-control" id="milestoneExpectedAgeInput" 
                                   min="0" max="60" />
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Achieved at (months)</label>
                            <input type="number" class="form-control" id="milestoneAchievedAgeInput" 
                                   min="0" max="60" value="${currentAgeMonths}" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Achievement Date</label>
                        <input type="date" class="form-control" id="milestoneAchievementDateInput" />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="milestoneDescInput" 
                                  placeholder="Details about this milestone" rows="2"></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Evidence/Notes</label>
                        <textarea class="form-control" id="milestoneNotesInput" 
                                  placeholder="How did you observe this milestone?" rows="2"></textarea>
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveMilestoneBtn">Record Milestone</button>
            `,
            onShow: function() {
                document.getElementById('saveMilestoneBtn').addEventListener('click', async function() {
                    const formData = {
                        name: document.getElementById('milestonNameInput').value,
                        domain: document.getElementById('milestoneDomainInput').value,
                        age_months_expected: parseInt(document.getElementById('milestoneExpectedAgeInput').value) || 0,
                        age_months_achieved: parseInt(document.getElementById('milestoneAchievedAgeInput').value) || currentAgeMonths,
                        achieved_date: document.getElementById('milestoneAchievementDateInput').value || new Date().toISOString().split('T')[0],
                        description: document.getElementById('milestoneDescInput').value,
                        evidence_notes: document.getElementById('milestoneNotesInput').value
                    };

                    if (!formData.name || !formData.domain) {
                        NeuroSarathi.UI.Toasts.show('Please fill in required fields', 'warning');
                        return;
                    }

                    await NeuroSarathi.Milestones.recordMilestone(formData);
                    document.querySelector('[data-dismiss="modal"]').click();
                });
            }
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Milestones module loaded');