// ============================================================
// NEUROSARATHI PHASE 2 - THERAPIST DASHBOARD MODULE
// Dashboard for therapists to manage their cases
// ============================================================

const TherapistDashboard = {
    async loadDashboard(therapistId) {
        const { data: dashboard, error: dashError } = await supabase
            .from('therapist_dashboards')
            .select('*')
            .eq('therapist_id', therapistId)
            .single();
        
        if (dashError && dashError.code !== 'PGRST116') {
            console.error('Error loading dashboard:', dashError);
            return null;
        }
        
        if (!dashboard) {
            // Create dashboard if doesn't exist
            return await this.initializeDashboard(therapistId);
        }
        
        return dashboard;
    },

    async initializeDashboard(therapistId) {
        const { data, error } = await supabase
            .from('therapist_dashboards')
            .insert([{
                therapist_id: therapistId,
                assigned_children_count: 0,
                upcoming_sessions_count: 0,
                pending_progress_updates: 0
            }])
            .select()
            .single();
        
        return data;
    },

    async getAssignedChildren(therapistId) {
        const { data, error } = await supabase
            .from('care_team_members')
            .select(`
                child_id,
                children:child_id (
                    id,
                    name,
                    date_of_birth,
                    profile_picture_url
                )
            `)
            .eq('user_id', therapistId)
            .eq('role', 'therapist');
        
        if (error) {
            console.error('Error loading assigned children:', error);
            return [];
        }
        return data || [];
    },

    async getUpcomingSessions(therapistId, daysAhead = 7) {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureString = futureDate.toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .select(`
                id,
                session_date,
                session_time,
                status,
                duration_minutes,
                location,
                child_id,
                children:child_id (id, name),
                therapy_plan_id,
                therapy_plans:therapy_plan_id (id, therapy_type)
            `)
            .eq('therapist_id', therapistId)
            .eq('status', 'scheduled')
            .gte('session_date', today)
            .lte('session_date', futureString)
            .order('session_date', { ascending: true });
        
        if (error) {
            console.error('Error loading sessions:', error);
            return [];
        }
        return data || [];
    },

    async getChildProgress(childId) {
        const { data, error } = await supabase
            .from('growth_trajectories')
            .select('*')
            .eq('child_id', childId);
        
        if (error) {
            console.error('Error loading progress:', error);
            return [];
        }
        return data || [];
    },

    async getChildRegressionAlerts(childId) {
        const { data, error } = await supabase
            .from('regression_alerts')
            .select('*')
            .eq('child_id', childId)
            .eq('is_acknowledged', false)
            .order('detected_date', { ascending: false });
        
        if (error) {
            console.error('Error loading alerts:', error);
            return [];
        }
        return data || [];
    },

    async updateDashboard(therapistId) {
        const children = await this.getAssignedChildren(therapistId);
        const sessions = await this.getUpcomingSessions(therapistId);
        
        let pendingUpdates = 0;
        for (const child of children) {
            const alerts = await this.getChildRegressionAlerts(child.child_id);
            pendingUpdates += alerts.length;
        }
        
        const { error } = await supabase
            .from('therapist_dashboards')
            .update({
                assigned_children_count: children.length,
                upcoming_sessions_count: sessions.length,
                pending_progress_updates: pendingUpdates,
                last_accessed: new Date().toISOString()
            })
            .eq('therapist_id', therapistId);
        
        if (error) console.error('Error updating dashboard:', error);
    },

    async getOverallMetrics(therapistId) {
        const children = await this.getAssignedChildren(therapistId);
        
        let onTrack = 0, behind = 0;
        
        for (const child of children) {
            const progress = await this.getChildProgress(child.child_id);
            progress.forEach(p => {
                if (p.trajectory_status === 'on_track') onTrack++;
                else if (p.trajectory_status === 'behind') behind++;
            });
        }
        
        return {
            total_children: children.length,
            children_on_track: onTrack,
            children_behind: behind,
            upcoming_sessions: (await this.getUpcomingSessions(therapistId)).length
        };
    },

    async renderDashboard(therapistId, containerId) {
        const metrics = await this.getOverallMetrics(therapistId);
        const sessions = await this.getUpcomingSessions(therapistId);
        const children = await this.getAssignedChildren(therapistId);
        
        const html = `
            <div class="therapist-dashboard">
                <h1>Therapist Dashboard</h1>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>${metrics.total_children}</h3>
                        <p>Assigned Children</p>
                    </div>
                    <div class="metric-card">
                        <h3>${metrics.children_on_track}</h3>
                        <p>On Track</p>
                    </div>
                    <div class="metric-card">
                        <h3>${metrics.children_behind}</h3>
                        <p>Need Support</p>
                    </div>
                    <div class="metric-card">
                        <h3>${metrics.upcoming_sessions}</h3>
                        <p>Upcoming Sessions</p>
                    </div>
                </div>
                
                <div class="sections-grid">
                    <section class="dashboard-section">
                        <h2>Upcoming Sessions (Next 7 Days)</h2>
                        ${sessions.length === 0 ? '<p>No upcoming sessions</p>' : `
                            <div class="sessions-list">
                                ${sessions.map(s => `
                                    <div class="session-item">
                                        <div class="session-date">${s.session_date} at ${s.session_time}</div>
                                        <div class="session-child">${s.children[0]?.name || 'Unknown'}</div>
                                        <div class="session-type">${s.therapy_plans[0]?.therapy_type || 'Therapy'}</div>
                                        <div class="session-location">${s.location === 'online' ? '🌐 Online' : '📍 ' + s.location}</div>
                                        <button class="btn-small" onclick="SessionScheduling.updateSessionStatus('${s.id}', 'in_progress')">Start</button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </section>
                    
                    <section class="dashboard-section">
                        <h2>Children Progress Overview</h2>
                        <div class="children-progress">
                            ${children.map(c => `
                                <div class="child-progress-card">
                                    <h3>${c.children[0]?.name || 'Unknown'}</h3>
                                    <button class="btn-small" onclick="window.location.href='/child-details.html?id=${c.child_id}'">View Details</button>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            </div>
        `;
        
        document.getElementById(containerId).innerHTML = html;
    }
};
