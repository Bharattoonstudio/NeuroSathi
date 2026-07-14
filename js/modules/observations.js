// ============================================================
// NEUROSARATHI V3 — modules/observations.js
// Observations Module
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Observations = {
    showAdd: function() {
        NeuroSarathi.UI.Modals.create({
            id: 'observationModal',
            header: '📝 Add Observation',
            body: `
                <form id="observationForm">
                    <div class="form-group">
                        <label class="form-label">What did you observe today?</label>
                        <textarea class="form-control" id="observationContent" rows="4"
                                  placeholder="Describe your child's progress, a special moment, or any observation..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">How was your child's mood?</label>
                        <div style="display:flex;gap:8px;font-size:28px;">
                            ${[1,2,3,4,5].map(i => `
                                <button type="button" class="mood-btn" data-mood="${i}"
                                        style="background:none;border:none;cursor:pointer;font-size:28px;transition:all 0.2s;
                                               opacity:${i === 3 ? '1' : '0.4'};">
                                    ${['😢','😟','😐','😊','😄'][i-1]}
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="observationMood" value="3" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Activity Type</label>
                        <select class="form-control form-select" id="observationActivity">
                            <option value="">Select type</option>
                            <option value="communication">🗣️ Communication</option>
                            <option value="social">👥 Social</option>
                            <option value="learning">📚 Learning</option>
                            <option value="play">🎨 Play</option>
                            <option value="routine">📋 Routine</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="NeuroSarathi.UI.Modals.hide('observationModal')">Cancel</button>
                <button class="btn btn-primary" id="saveObservationBtn">
                    <i class="fas fa-save"></i>
                    Save Observation
                </button>
            `
        });

        NeuroSarathi.UI.Modals.show('observationModal');

        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.mood-btn').forEach(b => b.style.opacity = '0.4');
                this.style.opacity = '1';
                document.getElementById('observationMood').value = this.dataset.mood;
            });
        });

        document.getElementById('saveObservationBtn').addEventListener('click', this._save.bind(this));
    },

    _save: async function() {
        const content = document.getElementById('observationContent').value.trim();
        const mood = parseInt(document.getElementById('observationMood').value);
        const activityType = document.getElementById('observationActivity').value;

        if (!content) {
            NeuroSarathi.UI.Toasts.show('Please enter an observation', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const childId = NeuroSarathi.State.get('activeChild.id');
            if (!childId) throw new Error('No child selected');

            await NeuroSarathi.API.saveObservation({
                child_id: childId,
                parent_id: user.id,
                content: content,
                mood_rating: mood,
                activity_type: activityType || null,
                category: activityType || 'general'
            });

            NeuroSarathi.UI.Modals.hide('observationModal');
            NeuroSarathi.UI.Toasts.show('Observation saved! 📝', 'success');

            await NeuroSarathi.Dashboard.loadDashboard();

        } catch (error) {
            console.error('Error saving observation:', error);
            NeuroSarathi.UI.Toasts.show('Failed to save observation', 'error');
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Observations module loaded');
