// ============================================================
// NEUROSARATHI V3 — modules/care-team.js
// Care Team Collaboration & Messaging (PHASE 1)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.CareTeam = {

    // Load care team members for active child
    load: async function() {
        try {
            const activeChild = NeuroSarathi.State.get('activeChild');
            if (!activeChild) return [];

            const { data, error } = await supabase
                .from('care_team_members')
                .select('*')
                .eq('child_id', activeChild.id)
                .order('added_at', { ascending: false });

            if (error) throw error;
            NeuroSarathi.State.set('careTeamMembers', data || []);
            return data || [];
        } catch (error) {
            console.error('Error loading care team:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load care team', 'error');
            return [];
        }
    },

    // Add care team member
    addMember: async function(memberData) {
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
                user_id: memberData.user_id || supabase.auth.user().id,
                role: memberData.role,
                relationship: memberData.relationship,
                name: memberData.name,
                email: memberData.email,
                phone: memberData.phone,
                can_view_progress: memberData.can_view_progress !== false,
                can_add_sessions: memberData.can_add_sessions || false,
                can_message: memberData.can_message !== false,
                can_edit_plans: memberData.can_edit_plans || false
            };

            const { data, error } = await supabase
                .from('care_team_members')
                .insert([payload])
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show(`${memberData.name} added to care team`, 'success');
            return data[0];
        } catch (error) {
            console.error('Error adding care team member:', error);
            NeuroSarathi.UI.Toasts.show('Failed to add team member', 'error');
            return null;
        }
    },

    // Update care team member permissions
    updatePermissions: async function(memberId, permissions) {
        try {
            const { data, error } = await supabase
                .from('care_team_members')
                .update({
                    ...permissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId)
                .select();

            if (error) throw error;
            await this.load();
            NeuroSarathi.UI.Toasts.show('Permissions updated', 'success');
            return data[0];
        } catch (error) {
            console.error('Error updating permissions:', error);
            NeuroSarathi.UI.Toasts.show('Failed to update permissions', 'error');
            return null;
        }
    },

    // Remove care team member
    removeMember: async function(memberId) {
        try {
            const { error } = await supabase
                .from('care_team_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Team member removed', 'success');
            return true;
        } catch (error) {
            console.error('Error removing team member:', error);
            NeuroSarathi.UI.Toasts.show('Failed to remove team member', 'error');
            return false;
        }
    },

    // Send message to care team member
    sendMessage: async function(recipientId, message, relatedType = null, relatedId = null) {
        try {
            const user = NeuroSarathi.State.get('user');
            const activeChild = NeuroSarathi.State.get('activeChild');

            if (!user || !activeChild) {
                NeuroSarathi.UI.Toasts.show('Please select a child first', 'warning');
                return null;
            }

            const payload = {
                child_id: activeChild.id,
                sender_id: user.id,
                recipient_id: recipientId,
                message: message,
                message_type: relatedType || 'text',
                related_goal_id: relatedType === 'goal_update' ? relatedId : null,
                related_session_id: relatedType === 'session_note' ? relatedId : null
            };

            const { data, error } = await supabase
                .from('care_team_messages')
                .insert([payload])
                .select();

            if (error) throw error;
            
            NeuroSarathi.UI.Toasts.show('Message sent', 'success');
            return data[0];
        } catch (error) {
            console.error('Error sending message:', error);
            NeuroSarathi.UI.Toasts.show('Failed to send message', 'error');
            return null;
        }
    },

    // Load messages between current user and specific person
    loadMessageHistory: async function(otherUserId) {
        try {
            const user = NeuroSarathi.State.get('user');
            const activeChild = NeuroSarathi.State.get('activeChild');

            if (!user || !activeChild) return [];

            const { data, error } = await supabase
                .from('care_team_messages')
                .select('*')
                .eq('child_id', activeChild.id)
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading message history:', error);
            return [];
        }
    },

    // Mark messages as read
    markAsRead: async function(messageIds) {
        try {
            if (!Array.isArray(messageIds)) messageIds = [messageIds];

            const { error } = await supabase
                .from('care_team_messages')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .in('id', messageIds);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking messages as read:', error);
            return false;
        }
    },

    // Get unread message count
    getUnreadCount: async function() {
        try {
            const user = NeuroSarathi.State.get('user');
            const activeChild = NeuroSarathi.State.get('activeChild');

            if (!user || !activeChild) return 0;

            const { count, error } = await supabase
                .from('care_team_messages')
                .select('*', { count: 'exact', head: true })
                .eq('child_id', activeChild.id)
                .eq('recipient_id', user.id)
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    },

    // Get members by role
    getByRole: function(role) {
        const members = NeuroSarathi.State.get('careTeamMembers') || [];
        return members.filter(m => m.role === role);
    },

    // Show add member modal
    showAddModal: function() {
        const roles = [
            'Parent', 'Therapist', 'Doctor', 
            'Special Educator', 'Family Member'
        ];

        const roleOptions = roles.map(r => 
            `<option value="${r.toLowerCase().replace(/\s+/g, '_')}">${r}</option>`
        ).join('');

        NeuroSarathi.UI.Modals.create({
            id: 'addTeamMemberModal',
            size: 'modal-lg',
            header: '👥 Add Care Team Member',
            body: `
                <form id="addTeamMemberForm">
                    <div class="form-group">
                        <label class="form-label">Member Name *</label>
                        <input type="text" class="form-control" id="memberNameInput" 
                               placeholder="Full name" required />
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Role *</label>
                            <select class="form-control form-select" id="memberRoleInput" required>
                                <option value="">Select Role</option>
                                ${roleOptions}
                            </select>
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Relationship</label>
                            <input type="text" class="form-control" id="memberRelationshipInput" 
                                   placeholder="e.g., Speech Therapist" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" id="memberEmailInput" 
                                   placeholder="email@example.com" />
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Phone</label>
                            <input type="tel" class="form-control" id="memberPhoneInput" 
                                   placeholder="+91 XXXXX XXXXX" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Permissions</label>
                        <div class="checkbox-group">
                            <label class="form-checkbox">
                                <input type="checkbox" id="permViewProgress" checked /> 
                                <span>Can view progress</span>
                            </label>
                            <label class="form-checkbox">
                                <input type="checkbox" id="permAddSessions" /> 
                                <span>Can add sessions</span>
                            </label>
                            <label class="form-checkbox">
                                <input type="checkbox" id="permMessage" checked /> 
                                <span>Can message</span>
                            </label>
                            <label class="form-checkbox">
                                <input type="checkbox" id="permEditPlans" /> 
                                <span>Can edit plans</span>
                            </label>
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveTeamMemberBtn">Add Member</button>
            `,
            onShow: function() {
                document.getElementById('saveTeamMemberBtn').addEventListener('click', async function() {
                    const formData = {
                        name: document.getElementById('memberNameInput').value,
                        role: document.getElementById('memberRoleInput').value,
                        relationship: document.getElementById('memberRelationshipInput').value,
                        email: document.getElementById('memberEmailInput').value,
                        phone: document.getElementById('memberPhoneInput').value,
                        can_view_progress: document.getElementById('permViewProgress').checked,
                        can_add_sessions: document.getElementById('permAddSessions').checked,
                        can_message: document.getElementById('permMessage').checked,
                        can_edit_plans: document.getElementById('permEditPlans').checked
                    };

                    if (!formData.name || !formData.role) {
                        NeuroSarathi.UI.Toasts.show('Please fill in required fields', 'warning');
                        return;
                    }

                    await NeuroSarathi.CareTeam.addMember(formData);
                    document.querySelector('[data-dismiss="modal"]').click();
                });
            }
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Care Team module loaded');