// ============================================================
// NEUROSARATHI V3 — modules/journal.js
// Parent Journal Module
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Journal = {
    showAdd: function() {
        const existing = document.getElementById('journalModal');
        if (existing) existing.remove();

        NeuroSarathi.UI.Modals.create({
            id: 'journalModal',
            size: 'modal-md',
            header: '📖 Write Journal Entry',
            body: `
                <form id="journalForm">
                    <div class="form-group">
                        <label class="form-label">How are you feeling today?</label>
                        <div style="display:flex;gap:8px;font-size:28px;">
                            ${[1,2,3,4,5].map(i => `
                                <button type="button" class="journal-mood-btn" data-mood="${i}"
                                        style="background:none;border:none;cursor:pointer;font-size:28px;transition:all 0.2s;
                                               opacity:${i === 3 ? '1' : '0.4'};">
                                    ${['😢','😟','😐','😊','😄'][i-1]}
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="journalMood" value="3" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">What happened today?</label>
                        <textarea class="form-control" id="journalContent" rows="5"
                                  placeholder="Write about your child's progress, a win, a challenge, or a special moment..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">What was a win today?</label>
                        <input type="text" class="form-control" id="journalWin" placeholder="A small victory..." />
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="NeuroSarathi.UI.Modals.hide('journalModal')">Cancel</button>
                <button class="btn btn-primary" id="saveJournalBtn">
                    <i class="fas fa-save"></i>
                    Save Entry
                </button>
            `
        });

        NeuroSarathi.UI.Modals.show('journalModal');

        document.querySelectorAll('.journal-mood-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.journal-mood-btn').forEach(b => b.style.opacity = '0.4');
                this.style.opacity = '1';
                document.getElementById('journalMood').value = this.dataset.mood;
            });
        });

        document.getElementById('saveJournalBtn').addEventListener('click', this._save.bind(this));
    },

    _save: async function() {
        const content = document.getElementById('journalContent').value.trim();
        const mood = parseInt(document.getElementById('journalMood').value);
        const win = document.getElementById('journalWin').value.trim();

        if (!content) {
            NeuroSarathi.UI.Toasts.show('Please write something', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const childId = NeuroSarathi.State.get('activeChild.id');
            if (!childId) throw new Error('No child selected');

            await NeuroSarathi.API.saveJournalEntry({
                child_id: childId,
                parent_id: user.id,
                content: content,
                mood: mood,
                win: win || null
            });

            NeuroSarathi.UI.Modals.hide('journalModal');
            NeuroSarathi.UI.Toasts.show('Journal entry saved! 📖', 'success');

            await NeuroSarathi.Dashboard.loadDashboard();

        } catch (error) {
            console.error('Error saving journal:', error);
            NeuroSarathi.UI.Toasts.show('Failed to save journal entry', 'error');
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Journal module loaded');
