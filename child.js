// ============================================================
// NEUROSARATHI V2 — child.js
// Child Management Module
// ============================================================

// ─── CHILD CRUD OPERATIONS ───────────────────────────────────

/**
 * Load all children for the current user
 */
async function loadChildren() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const children = await getChildren(user.id);
        state.children = children;

        if (children.length > 0 && !state.activeChild) {
            state.activeChild = children[0];
        }

        renderChildSelector();
        updateHeroInfo();
        return children;

    } catch (error) {
        console.error('Error loading children:', error);
        showToast('Failed to load children', 'error');
        return [];
    }
}

/**
 * Add a new child
 */
async function addChild(childData, photoFile = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Validate required fields
        if (!childData.name || !childData.date_of_birth) {
            throw new Error('Name and date of birth are required');
        }

        // Create child record
        const newChild = await createChild({
            parent_id: user.id,
            name: childData.name,
            date_of_birth: childData.date_of_birth,
            gender: childData.gender || null,
            school: childData.school || null,
            class: childData.class || null,
            learning_focus: childData.learning_focus || [],
            goals: childData.goals || [],
            preferences: childData.preferences || {}
        });

        // Upload photo if provided
        if (photoFile) {
            const path = `${user.id}/${newChild.id}/avatar.${photoFile.name.split('.').pop()}`;
            const { data } = await uploadDocument(photoFile, path);
            if (data) {
                await updateChild(newChild.id, { photo_url: data.path });
                newChild.photo_url = data.path;
            }
        }

        // Update state
        state.children.push(newChild);
        state.activeChild = newChild;

        // Update UI
        renderChildSelector();
        updateHeroInfo();
        updatePageTitle();

        // Reload dashboard data
        await loadDashboardData();

        return newChild;

    } catch (error) {
        console.error('Error adding child:', error);
        showToast(error.message || 'Failed to add child', 'error');
        throw error;
    }
}

/**
 * Update an existing child
 */
async function updateChildProfile(childId, updates, photoFile = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update child record
        const updatedChild = await updateChild(childId, updates);

        // Upload new photo if provided
        if (photoFile) {
            const path = `${user.id}/${childId}/avatar.${photoFile.name.split('.').pop()}`;
            const { data } = await uploadDocument(photoFile, path);
            if (data) {
                await updateChild(childId, { photo_url: data.path });
                updatedChild.photo_url = data.path;
            }
        }

        // Update state
        const index = state.children.findIndex(c => c.id === childId);
        if (index !== -1) {
            state.children[index] = updatedChild;
        }
        if (state.activeChild?.id === childId) {
            state.activeChild = updatedChild;
        }

        // Update UI
        renderChildSelector();
        updateHeroInfo();

        return updatedChild;

    } catch (error) {
        console.error('Error updating child:', error);
        showToast(error.message || 'Failed to update child', 'error');
        throw error;
    }
}

/**
 * Delete a child
 */
async function deleteChildProfile(childId) {
    try {
        const confirmed = confirm('Are you sure you want to delete this child? This cannot be undone.');
        if (!confirmed) return false;

        await deleteChild(childId);

        // Update state
        state.children = state.children.filter(c => c.id !== childId);
        if (state.activeChild?.id === childId) {
            state.activeChild = state.children[0] || null;
        }

        // Update UI
        renderChildSelector();
        updateHeroInfo();

        if (state.children.length === 0) {
            showEmptyState();
        }

        showToast('Child deleted successfully', 'success');
        return true;

    } catch (error) {
        console.error('Error deleting child:', error);
        showToast('Failed to delete child', 'error');
        return false;
    }
}

/**
 * Switch active child
 */
function switchChild(childId) {
    const child = state.children.find(c => c.id === childId);
    if (!child) return;

    state.activeChild = child;

    // Update UI
    renderChildSelector();
    updateHeroInfo();
    updatePageTitle();

    // Close dropdown
    document.getElementById('childDropdown')?.classList.remove('open');

    // Reload dashboard data
    loadDashboardData();

    showToast(`Switched to ${child.name}`, 'success');
}

// ─── RENDER FUNCTIONS ────────────────────────────────────────

/**
 * Render child selector in top bar
 */
function renderChildSelector() {
    const { activeChild, children } = state;
    if (!activeChild) {
        document.getElementById('childName').textContent = 'No child';
        document.getElementById('childAge').textContent = '—';
        document.getElementById('childAvatar').innerHTML = '<span>?</span>';
        return;
    }

    const initials = getInitials(activeChild.name);
    document.getElementById('childAvatar').innerHTML = `<span>${initials}</span>`;
    document.getElementById('childName').textContent = activeChild.name;
    document.getElementById('childAge').textContent = `${getAge(activeChild.date_of_birth)} Years`;

    // Render dropdown
    const dropdownList = document.getElementById('childDropdownList');
    if (dropdownList) {
        dropdownList.innerHTML = '';
        children.forEach(child => {
            const item = document.createElement('div');
            item.className = `child-dropdown-item ${child.id === activeChild.id ? 'active' : ''}`;
            const childInitials = getInitials(child.name);
            item.innerHTML = `
                <div class="avatar" style="background: ${child.photo_url ? 'transparent' : 'linear-gradient(135deg, #5b8dd9, #7ba3e6)'}">
                    ${child.photo_url ? `<img src="${child.photo_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : childInitials}
                </div>
                <div class="info">
                    <div class="name">${child.name}</div>
                    <div class="detail">${getAge(child.date_of_birth)} Years</div>
                </div>
                ${child.id === activeChild.id ? '<i class="fas fa-check" style="color:#5b8dd9;"></i>' : ''}
            `;
            item.addEventListener('click', () => switchChild(child.id));
            dropdownList.appendChild(item);
        });
    }
}

/**
 * Update hero section with child info
 */
function updateHeroInfo() {
    const { profile, activeChild } = state;
    if (!activeChild) {
        document.getElementById('heroChildName').textContent = 'No child added';
        document.getElementById('heroChildAge').textContent = '—';
        document.getElementById('heroChildClass').textContent = '—';
        document.getElementById('heroChildFocus').textContent = 'Add a child to start';
        return;
    }

    const firstName = profile?.full_name?.split(' ')[0] || 'Parent';
    const greeting = getTimeGreeting();

    document.getElementById('heroGreeting').textContent = `${greeting}, ${firstName}! 👋`;
    document.getElementById('heroSubtitle').textContent = `You are doing a wonderful job supporting ${activeChild.name}'s journey. 🥰`;
    document.getElementById('heroChildName').textContent = activeChild.name;
    document.getElementById('heroChildAge').textContent = `${getAge(activeChild.date_of_birth)} Years`;
    document.getElementById('heroChildClass').textContent = activeChild.class || '—';

    const focus = activeChild.learning_focus || [];
    document.getElementById('heroChildFocus').textContent = focus.length > 0 ? focus.slice(0, 2).join(', ') : 'Exploring learning';

    document.getElementById('heroAiMessage').textContent = `I've prepared today's plan for ${activeChild.name}. Let's make it a day full of small wins! 🥳`;
    document.getElementById('aiCardMessage').textContent = `I've prepared today's learning plan for ${activeChild.name}. Let's make it a day full of small wins! ✨`;
}

// ─── CHILD SELECTOR DROPDOWN ────────────────────────────────

/**
 * Toggle child dropdown
 */
function toggleChildDropdown(e) {
    e?.stopPropagation();
    const dropdown = document.getElementById('childDropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

/**
 * Close child dropdown on outside click
 */
document.addEventListener('click', function(e) {
    const selector = document.getElementById('childSelector');
    const dropdown = document.getElementById('childDropdown');
    if (selector && dropdown && !selector.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

// ─── ADD CHILD MODAL ─────────────────────────────────────────

/**
 * Show add child modal
 */
function showAddChildModal() {
    // Reset form
    document.getElementById('addChildForm').reset();
    const preview = document.querySelector('#photoUpload .photo-preview');
    if (preview) {
        preview.innerHTML = `
            <i class="fas fa-camera"></i>
            <span>Upload Photo</span>
        `;
        preview.classList.remove('has-image');
    }
    document.getElementById('photoInput').value = '';
    showModal('addChildModal');
}

/**
 * Handle add child form submission
 */
async function handleAddChildSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('addChildForm');
    const name = document.getElementById('childNameInput').value.trim();
    const dob = document.getElementById('childDobInput').value;
    const gender = document.getElementById('childGenderInput').value;
    const school = document.getElementById('childSchoolInput').value.trim();
    const classVal = document.getElementById('childClassInput').value.trim();

    // Validate
    if (!name) {
        showToast('Please enter child\'s name', 'error');
        return;
    }
    if (!dob) {
        showToast('Please select date of birth', 'error');
        return;
    }

    // Get learning focus
    const focusCheckboxes = form.querySelectorAll('.form-group:first-of-type .checkbox-grid input[type="checkbox"]');
    const learningFocus = [];
    focusCheckboxes.forEach(cb => {
        if (cb.checked) learningFocus.push(cb.value);
    });

    // Get goals
    const goalCheckboxes = form.querySelectorAll('.form-group:last-of-type .checkbox-grid input[type="checkbox"]');
    const goals = [];
    goalCheckboxes.forEach(cb => {
        if (cb.checked) goals.push(cb.value);
    });

    const photoFile = document.getElementById('photoInput').files[0];

    try {
        const saveBtn = document.getElementById('saveChildBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

        const childData = {
            name,
            date_of_birth: dob,
            gender: gender || null,
            school: school || null,
            class: classVal || null,
            learning_focus: learningFocus,
            goals: goals,
        };

        await addChild(childData, photoFile);

        hideModal('addChildModal');
        showToast(`${name} has been added! 🎉`, 'success');

    } catch (error) {
        console.error('Error in handleAddChildSubmit:', error);
    } finally {
        const saveBtn = document.getElementById('saveChildBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Child';
    }
}

// ─── EDIT CHILD ──────────────────────────────────────────────

/**
 * Show edit child modal
 */
function showEditChildModal(childId) {
    const child = state.children.find(c => c.id === childId);
    if (!child) return;

    // Populate form
    document.getElementById('editChildId').value = child.id;
    document.getElementById('editChildName').value = child.name;
    document.getElementById('editChildDob').value = child.date_of_birth;
    document.getElementById('editChildGender').value = child.gender || '';
    document.getElementById('editChildSchool').value = child.school || '';
    document.getElementById('editChildClass').value = child.class || '';

    // Populate learning focus
    const focusCheckboxes = document.querySelectorAll('#editChildForm .form-group:first-of-type .checkbox-grid input[type="checkbox"]');
    focusCheckboxes.forEach(cb => {
        cb.checked = (child.learning_focus || []).includes(cb.value);
    });

    // Populate goals
    const goalCheckboxes = document.querySelectorAll('#editChildForm .form-group:last-of-type .checkbox-grid input[type="checkbox"]');
    goalCheckboxes.forEach(cb => {
        cb.checked = (child.goals || []).includes(cb.value);
    });

    // Show photo preview
    const preview = document.querySelector('#editPhotoUpload .photo-preview');
    if (child.photo_url) {
        preview.innerHTML = `<img src="${child.photo_url}" alt="${child.name}" />`;
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = `
            <i class="fas fa-camera"></i>
            <span>Upload Photo</span>
        `;
        preview.classList.remove('has-image');
    }

    showModal('editChildModal');
}

/**
 * Handle edit child form submission
 */
async function handleEditChildSubmit(e) {
    e.preventDefault();

    const childId = document.getElementById('editChildId').value;
    const name = document.getElementById('editChildName').value.trim();
    const dob = document.getElementById('editChildDob').value;
    const gender = document.getElementById('editChildGender').value;
    const school = document.getElementById('editChildSchool').value.trim();
    const classVal = document.getElementById('editChildClass').value.trim();

    if (!name || !dob) {
        showToast('Name and date of birth are required', 'error');
        return;
    }

    // Get learning focus
    const form = document.getElementById('editChildForm');
    const focusCheckboxes = form.querySelectorAll('.form-group:first-of-type .checkbox-grid input[type="checkbox"]');
    const learningFocus = [];
    focusCheckboxes.forEach(cb => {
        if (cb.checked) learningFocus.push(cb.value);
    });

    // Get goals
    const goalCheckboxes = form.querySelectorAll('.form-group:last-of-type .checkbox-grid input[type="checkbox"]');
    const goals = [];
    goalCheckboxes.forEach(cb => {
        if (cb.checked) goals.push(cb.value);
    });

    const photoFile = document.getElementById('editPhotoInput').files[0];

    try {
        const saveBtn = document.getElementById('editChildSaveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

        const updates = {
            name,
            date_of_birth: dob,
            gender: gender || null,
            school: school || null,
            class: classVal || null,
            learning_focus: learningFocus,
            goals: goals,
        };

        await updateChildProfile(childId, updates, photoFile);

        hideModal('editChildModal');
        showToast(`${name} updated successfully! ✅`, 'success');

    } catch (error) {
        console.error('Error in handleEditChildSubmit:', error);
    } finally {
        const saveBtn = document.getElementById('editChildSaveBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Child';
    }
}

/**
 * Delete child from edit modal
 */
async function deleteChildFromModal() {
    const childId = document.getElementById('editChildId').value;
    const child = state.children.find(c => c.id === childId);
    if (!child) return;

    const confirmed = confirm(`Are you sure you want to delete ${child.name}? This cannot be undone.`);
    if (!confirmed) return;

    const success = await deleteChildProfile(childId);
    if (success) {
        hideModal('editChildModal');
    }
}

// ─── PHOTO UPLOAD HANDLERS ──────────────────────────────────

/**
 * Handle photo upload preview
 * NOTE: this generic version takes (inputId, previewId) strings.
 * dashboard.js's add-child-modal photo handler is intentionally named
 * differently (handleAddChildPhotoUpload) to avoid colliding with this
 * function under the same global name — the two had incompatible
 * signatures (dashboard.js's took an Event, this one takes two strings).
 */
function handlePhotoUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.querySelector(`#${previewId} .photo-preview`);
    if (!input || !preview) return;

    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        preview.innerHTML = `<img src="${event.target.result}" alt="Child photo" />`;
        preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.loadChildren = loadChildren;
window.addChild = addChild;
window.updateChildProfile = updateChildProfile;
window.deleteChildProfile = deleteChildProfile;
window.switchChild = switchChild;
window.renderChildSelector = renderChildSelector;
window.updateHeroInfo = updateHeroInfo;
window.toggleChildDropdown = toggleChildDropdown;
window.showAddChildModal = showAddChildModal;
window.handleAddChildSubmit = handleAddChildSubmit;
window.showEditChildModal = showEditChildModal;
window.handleEditChildSubmit = handleEditChildSubmit;
window.deleteChildFromModal = deleteChildFromModal;
window.handlePhotoUpload = handlePhotoUpload;

console.log('🧠 NeuroSarathi V2 — Child Module Loaded');
