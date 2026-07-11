// ============================================================
// NEUROSARATHI V3 — modules/children.js
// Child Management with Continuation Flow
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Children = {
    _onboardingMode: false,

    load: async function() {
        try {
            const user = NeuroSarathi.State.get('user');
            if (!user) return [];

            const children = await getChildren(user.id);
            NeuroSarathi.State.set('children', children);

            if (children.length > 0) {
                const activeChild = NeuroSarathi.State.get('activeChild') || children[0];
                NeuroSarathi.State.set('activeChild', activeChild);
            }

            return children;
        } catch (error) {
            console.error('Error loading children:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load children', 'error');
            return [];
        }
    },

    switchChild: async function(childId) {
        const child = NeuroSarathi.State.get('children').find(c => c.id === childId);
        if (!child) return;

        NeuroSarathi.State.set('activeChild', child);
        document.getElementById('childDropdown')?.classList.remove('open');
        await NeuroSarathi.Dashboard.loadChildContext();
        NeuroSarathi.UI.Toasts.show(`Switched to ${child.name}`, 'success');
    },

    /**
     * @param {Object} options - { onboarding: boolean, mode: string }
     */
    showAddModal: function(options = {}) {
        const isOnboarding = options.onboarding === true || options.mode === 'onboarding';
        this._onboardingMode = isOnboarding;

        NeuroSarathi.UI.Modals.create({
            id: 'addChildModal',
            size: 'modal-lg',
            header: isOnboarding ? '👶 Add Your First Child' : '👶 Add Child',
            body: `
                <form id="addChildForm">
                    <div class="form-group">
                        <label class="form-label">Photo</label>
                        <div class="photo-upload" id="photoUpload">
                            <div class="photo-preview" id="photoPreview">
                                <i class="fas fa-camera"></i>
                                <span>Upload Photo</span>
                            </div>
                            <input type="file" id="photoInput" accept="image/*" style="display:none" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Child Name *</label>
                        <input type="text" class="form-control" id="childNameInput" placeholder="Enter child's name" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date of Birth *</label>
                        <input type="date" class="form-control" id="childDobInput" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Gender</label>
                        <select class="form-control form-select" id="childGenderInput">
                            <option value="">Select</option>
                            <option value="male">Boy</option>
                            <option value="female">Girl</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">School</label>
                        <input type="text" class="form-control" id="childSchoolInput" placeholder="School name" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Class</label>
                        <input type="text" class="form-control" id="childClassInput" placeholder="e.g. 2nd Grade" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Areas of Support</label>
                        <div class="checkbox-grid">
                            <label class="form-checkbox"><input type="checkbox" value="communication" /><span>🗣️ Communication</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="social" /><span>👥 Social Skills</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="attention" /><span>🎯 Attention</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="learning" /><span>📚 Learning</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="sensory" /><span>🎨 Sensory</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="motor" /><span>🏃 Motor Skills</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="daily_living" /><span>🧹 Daily Living</span></label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Educational Goals</label>
                        <div class="checkbox-grid">
                            <label class="form-checkbox"><input type="checkbox" value="routine" /><span>Build a Daily Routine</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="communication" /><span>Improve Communication</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="school_readiness" /><span>School Readiness</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="learn_autism" /><span>Learn About Autism</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="learn_adhd" /><span>Learn About ADHD</span></label>
                            <label class="form-checkbox"><input type="checkbox" value="wellbeing" /><span>Parent Wellbeing</span></label>
                        </div>
                    </div>
                </form>
                ${isOnboarding ? `
                    <div style="margin-top:16px;padding:16px;background:rgba(91,141,217,0.06);border-radius:12px;border:1px solid rgba(91,141,217,0.12);">
                        <p style="font-size:13px;color:#64748b;margin:0;">
                            ⚡ This is the first step. After saving, we'll create your child's learning profile.
                        </p>
                    </div>
                ` : ''}
            `,
            footer: `
                <button class="btn btn-secondary" onclick="NeuroSarathi.UI.Modals.hide('addChildModal')">Cancel</button>
                <button class="btn btn-primary" id="saveChildBtn">
                    <i class="fas fa-save"></i>
                    ${isOnboarding ? 'Start Journey' : 'Save Child'}
                </button>
            `
        });

        NeuroSarathi.UI.Modals.show('addChildModal');

        const photoUpload = document.getElementById('photoUpload');
        const photoInput = document.getElementById('photoInput');
        if (photoUpload && photoInput) {
            photoUpload.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('photoPreview');
                    if (preview) {
                        preview.innerHTML = `<img src="${event.target.result}" alt="Child photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" />`;
                        preview.classList.add('has-image');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        document.getElementById('saveChildBtn').addEventListener('click', () => this._saveChild());
    },

    _saveChild: async function() {
        const name = document.getElementById('childNameInput').value.trim();
        const dob = document.getElementById('childDobInput').value;
        const gender = document.getElementById('childGenderInput').value;
        const school = document.getElementById('childSchoolInput').value.trim();
        const classVal = document.getElementById('childClassInput').value.trim();
        const isOnboarding = this._onboardingMode;

        if (!name || !dob) {
            NeuroSarathi.UI.Toasts.show('Please fill in name and date of birth', 'error');
            return;
        }

        const focusCheckboxes = document.querySelectorAll('#addChildForm .checkbox-grid:first-of-type input[type="checkbox"]:checked');
        const learningFocus = Array.from(focusCheckboxes).map(cb => cb.value);

        const goalCheckboxes = document.querySelectorAll('#addChildForm .checkbox-grid:last-of-type input[type="checkbox"]:checked');
        const goals = Array.from(goalCheckboxes).map(cb => cb.value);

        const photoFile = document.getElementById('photoInput').files[0];

        try {
            const saveBtn = document.getElementById('saveChildBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const childData = {
                parent_id: user.id,
                name: name,
                date_of_birth: dob,
                gender: gender || null,
                school: school || null,
                class: classVal || null,
                learning_focus: learningFocus,
                goals: goals,
                preferences: {}
            };

            const child = await createChild(childData);

            if (photoFile) {
                const path = `${user.id}/${child.id}/avatar.${photoFile.name.split('.').pop()}`;
                const { data } = await uploadDocument(photoFile, path);
                if (data) {
                    await updateChild(child.id, { photo_url: data.path });
                    child.photo_url = data.path;
                }
            }

            const children = NeuroSarathi.State.get('children') || [];
            children.push(child);
            NeuroSarathi.State.set('children', children);
            NeuroSarathi.State.set('activeChild', child);

            NeuroSarathi.UI.Modals.hide('addChildModal');

            if (isOnboarding) {
                await this._completeOnboarding(child);
            } else {
                await NeuroSarathi.Dashboard.loadChildContext();
                NeuroSarathi.UI.Toasts.show(`${name} added successfully! 🎉`, 'success');
            }

            this._onboardingMode = false;

        } catch (error) {
            console.error('Error saving child:', error);
            NeuroSarathi.UI.Toasts.show('Failed to save child', 'error');
        } finally {
            const saveBtn = document.getElementById('saveChildBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${this._onboardingMode ? 'Start Journey' : 'Save Child'}`;
            }
        }
    },

    _completeOnboarding: async function(child) {
        try {
            await this._createDefaultRoutines(child.id);

            const user = NeuroSarathi.State.get('user');
            if (user) {
                await updateProfile(user.id, { onboarding_completed: true });
                NeuroSarathi.State.set('profile.onboarding_completed', true);
                NeuroSarathi.State.set('onboardingComplete', true);
            }

            await NeuroSarathi.Dashboard.loadChildContext();

            NeuroSarathi.UI.Toasts.show(`🎉 Welcome to NeuroSarathi! ${child.name}'s journey begins now.`, 'success');

            setTimeout(() => {
                NeuroSarathi.Chat?.toggle();
                const input = document.getElementById('chatInput');
                if (input) {
                    input.value = `Hello! I'm new here. Can you tell me about ${child.name}?`;
                    NeuroSarathi.Chat?.sendMessage();
                }
            }, 1000);

        } catch (error) {
            console.error('Error completing onboarding:', error);
            NeuroSarathi.UI.Toasts.show('Onboarding complete, but some features may need setup.', 'warning');
        }
    },

    _createDefaultRoutines: async function(childId) {
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
        // NOTE: removed the dead placeholder state.set('dashboard.routines', ...)
        // that used to sit here — loadChildContext() → loadDashboard() re-fetches
        // real routines (with real ids) from Supabase immediately after this
        // function returns, so the placeholder was always overwritten before
        // any render happened. Keeping it would only risk confusing future
        // edits into thinking it did something load-bearing.
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Children module loaded');
