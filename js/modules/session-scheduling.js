// ============================================================
// NEUROSARATHI PHASE 2 - SESSION SCHEDULING MODULE
// Book and manage therapy sessions
// ============================================================

const SessionScheduling = {
    async scheduleSession(therapyPlanId, childId, therapistId, parentId, sessionDate, sessionTime, durationMinutes, location, meetingLink = null) {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .insert([{
                therapy_plan_id: therapyPlanId,
                child_id: childId,
                therapist_id: therapistId,
                parent_id: parentId,
                session_date: sessionDate,
                session_time: sessionTime,
                duration_minutes: durationMinutes,
                location: location,
                meeting_link: meetingLink,
                status: 'scheduled'
            }])
            .select();
        
        if (error) {
            console.error('Error scheduling session:', error);
            return null;
        }
        
        // Send notification to parent and therapist
        await this.sendSessionNotification(data[0]);
        
        return data[0];
    },

    async getAvailableSlots(therapistId, date) {
        // Get therapist's availability for the day
        const dayOfWeek = new Date(date).getDay();
        
        const { data: availability, error: availError } = await supabase
            .from('therapist_availability')
            .select('*')
            .eq('therapist_id', therapistId)
            .eq('day_of_week', dayOfWeek)
            .eq('is_available', true);
        
        if (availError || !availability || availability.length === 0) {
            return [];
        }
        
        // Get booked sessions for the day
        const { data: booked, error: bookedError } = await supabase
            .from('scheduled_sessions')
            .select('session_time, duration_minutes')
            .eq('therapist_id', therapistId)
            .eq('session_date', date)
            .eq('status', 'scheduled');
        
        if (bookedError) booked = [];
        
        // Generate available slots
        const slots = [];
        const slot_duration = 60; // 1 hour slots
        
        availability.forEach(avail => {
            let current = new Date(`${date}T${avail.start_time}`);
            const end = new Date(`${date}T${avail.end_time}`);
            
            while (current < end) {
                const timeStr = current.getHours().toString().padStart(2, '0') + ':' + 
                               current.getMinutes().toString().padStart(2, '0');
                
                // Check if slot is booked
                const isBooked = booked.some(b => {
                    const bookedTime = b.session_time;
                    return bookedTime === timeStr;
                });
                
                if (!isBooked) {
                    slots.push(timeStr);
                }
                
                current.setMinutes(current.getMinutes() + slot_duration);
            }
        });
        
        return slots;
    },

    async rescheduleSession(sessionId, newDate, newTime) {
        const { data: session, error: fetchError } = await supabase
            .from('scheduled_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        
        if (fetchError) {
            console.error('Error fetching session:', fetchError);
            return null;
        }
        
        // Create new session with new date/time
        const newSession = await this.scheduleSession(
            session.therapy_plan_id,
            session.child_id,
            session.therapist_id,
            session.parent_id,
            newDate,
            newTime,
            session.duration_minutes,
            session.location,
            session.meeting_link
        );
        
        // Mark original as rescheduled
        await supabase
            .from('scheduled_sessions')
            .update({
                status: 'rescheduled',
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
        
        return newSession;
    },

    async cancelSession(sessionId, reason = null, cancelledById = null) {
        const { error } = await supabase
            .from('scheduled_sessions')
            .update({
                status: 'cancelled',
                cancellation_reason: reason,
                cancelled_by_id: cancelledById,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', sessionId);
        
        if (error) {
            console.error('Error cancelling session:', error);
            return false;
        }
        
        return true;
    },

    async updateSessionStatus(sessionId, newStatus) {
        const { error } = await supabase
            .from('scheduled_sessions')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
        
        if (error) {
            console.error('Error updating session:', error);
            return false;
        }
        
        return true;
    },

    async recordAttendance(sessionId, attended, childCooperationLevel = null, parentPresent = false, notes = null) {
        const { data: session, error: fetchError } = await supabase
            .from('scheduled_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        
        if (fetchError) {
            console.error('Error fetching session:', fetchError);
            return null;
        }
        
        const { data, error } = await supabase
            .from('session_attendance')
            .insert([{
                session_id: sessionId,
                child_id: session.child_id,
                therapist_id: session.therapist_id,
                attended: attended,
                start_time: new Date().toISOString(),
                child_cooperation_level: childCooperationLevel,
                parent_present: parentPresent,
                notes: notes
            }])
            .select();
        
        if (error) {
            console.error('Error recording attendance:', error);
            return null;
        }
        
        // Update session status to completed
        await this.updateSessionStatus(sessionId, 'completed');
        
        return data[0];
    },

    async getSessionHistory(childId) {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .select(`
                *,
                session_attendance (
                    attended,
                    child_cooperation_level,
                    parent_present,
                    notes
                )
            `)
            .eq('child_id', childId)
            .in('status', ['completed', 'cancelled'])
            .order('session_date', { ascending: false });
        
        if (error) {
            console.error('Error loading session history:', error);
            return [];
        }
        return data || [];
    },

    async sendSessionNotification(session) {
        // TODO: Send push notifications to parent and therapist
        // This would integrate with a notification service
        console.log('Session scheduled notification sent for session:', session.id);
    },

    async showScheduleModal(therapyPlanId, childId, therapistId, parentId) {
        const html = `
            <div class="modal-content">
                <h2>Schedule Session</h2>
                <div class="form-group">
                    <label>Select Date:</label>
                    <input type="date" id="sessionDate">
                </div>
                <div class="form-group">
                    <label>Available Times:</label>
                    <select id="sessionTime">
                        <option>Select a time...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Duration (minutes):</label>
                    <input type="number" id="duration" value="60" min="30" step="15">
                </div>
                <div class="form-group">
                    <label>Location:</label>
                    <select id="location">
                        <option value="clinic">Clinic</option>
                        <option value="home">Home</option>
                        <option value="online">Online</option>
                    </select>
                </div>
                <div class="form-group" id="meetingLinkGroup" style="display:none;">
                    <label>Meeting Link (for online sessions):</label>
                    <input type="url" id="meetingLink" placeholder="https://meet.example.com">
                </div>
                <button class="btn-primary" onclick="SessionScheduling.handleScheduleSession('${therapyPlanId}', '${childId}', '${therapistId}', '${parentId}')">Schedule</button>
            </div>
        `;
        
        showModal(html);
        
        // Show meeting link field when online is selected
        document.getElementById('location').addEventListener('change', (e) => {
            document.getElementById('meetingLinkGroup').style.display = 
                e.target.value === 'online' ? 'block' : 'none';
        });
        
        // Load available times when date is selected
        document.getElementById('sessionDate').addEventListener('change', async (e) => {
            const slots = await SessionScheduling.getAvailableSlots(therapistId, e.target.value);
            const timeSelect = document.getElementById('sessionTime');
            timeSelect.innerHTML = '<option>Select a time...</option>' +
                slots.map(s => `<option value="${s}">${s}</option>`).join('');
        });
    },

    async handleScheduleSession(therapyPlanId, childId, therapistId, parentId) {
        const date = document.getElementById('sessionDate').value;
        const time = document.getElementById('sessionTime').value;
        const duration = parseInt(document.getElementById('duration').value);
        const location = document.getElementById('location').value;
        const meetingLink = document.getElementById('meetingLink')?.value || null;
        
        if (!date || !time) {
            alert('Please select both date and time');
            return;
        }
        
        const result = await this.scheduleSession(therapyPlanId, childId, therapistId, parentId, date, time, duration, location, meetingLink);
        
        if (result) {
            alert('Session scheduled successfully');
            closeModal();
            location.reload();
        }
    }
};
