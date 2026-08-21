// ============================================================
// NEUROSARATHI PHASE 2 - REGRESSION ALERTS MODULE
// Detect and manage developmental regressions
// ============================================================

const RegressionAlerts = {
    // Thresholds for regression detection
    regressionThreshold: 15, // 15% decrease = regression
    delayThreshold: 2, // 2 months behind = delay
    
    async detectRegressions(childId) {
        // Get all growth trajectories for the child
        const { data: trajectories, error } = await supabase
            .from('growth_trajectories')
            .select('*')
            .eq('child_id', childId);
        
        if (error || !trajectories) return [];
        
        const alerts = [];
        
        for (const trajectory of trajectories) {
            // Check for regression
            if (trajectory.current_value < trajectory.baseline_value) {
                const percentChange = ((trajectory.current_value - trajectory.baseline_value) / trajectory.baseline_value) * 100;
                
                if (percentChange < -this.regressionThreshold) {
                    alerts.push({
                        type: 'regression_detected',
                        domain: trajectory.domain,
                        severity: this.calculateSeverity(percentChange),
                        baseline: trajectory.baseline_value,
                        current: trajectory.current_value,
                        changePercentage: percentChange
                    });
                }
            }
            
            // Check for developmental delay
            if (trajectory.trajectory_status === 'behind' && trajectory.months_to_goal > this.delayThreshold) {
                alerts.push({
                    type: 'milestone_delayed',
                    domain: trajectory.domain,
                    severity: 'medium',
                    monthsToGoal: trajectory.months_to_goal
                });
            }
            
            // Check for stalled progress
            if (trajectory.monthly_progress_rate <= 0.1) {
                alerts.push({
                    type: 'goal_stalled',
                    domain: trajectory.domain,
                    severity: 'low'
                });
            }
        }
        
        // Save new alerts to database
        const { data: { user } } = await supabase.auth.getUser();
        
        for (const alert of alerts) {
            // Check if alert already exists
            const { data: existing } = await supabase
                .from('regression_alerts')
                .select('id')
                .eq('child_id', childId)
                .eq('alert_type', alert.type)
                .eq('domain', alert.domain)
                .eq('is_acknowledged', false)
                .limit(1);
            
            if (!existing || existing.length === 0) {
                // Create new alert
                await supabase
                    .from('regression_alerts')
                    .insert([{
                        child_id: childId,
                        parent_id: user.id,
                        alert_type: alert.type,
                        domain: alert.domain,
                        severity: alert.severity,
                        detected_date: new Date().toISOString().split('T')[0],
                        baseline_value: alert.baseline,
                        current_value: alert.current,
                        change_percentage: alert.changePercentage,
                        description: this.generateAlertDescription(alert),
                        recommended_action: this.generateRecommendedAction(alert)
                    }]);
            }
        }
        
        return alerts;
    },

    calculateSeverity(percentChange) {
        if (percentChange < -30) return 'high';
        if (percentChange < -20) return 'medium';
        return 'low';
    },

    generateAlertDescription(alert) {
        switch (alert.type) {
            case 'regression_detected':
                return `A ${Math.abs(alert.changePercentage).toFixed(1)}% decline in ${alert.domain} has been detected.`;
            case 'milestone_delayed':
                return `${alert.domain} milestone is delayed by approximately ${alert.monthsToGoal} months.`;
            case 'goal_stalled':
                return `Progress in ${alert.domain} appears to have stalled.`;
            default:
                return 'Progress alert detected.';
        }
    },

    generateRecommendedAction(alert) {
        switch (alert.type) {
            case 'regression_detected':
                return 'Consider scheduling an evaluation with your therapist to discuss the regression and adjust intervention strategies.';
            case 'milestone_delayed':
                return 'Discuss with your therapist about intensifying current activities or trying new approaches.';
            case 'goal_stalled':
                return 'Review current strategies and consider implementing additional support activities.';
            default:
                return 'Monitor closely and discuss with your therapist.';
        }
    },

    async getAlerts(childId, unacknowledgedOnly = true) {
        let query = supabase
            .from('regression_alerts')
            .select('*')
            .eq('child_id', childId);
        
        if (unacknowledgedOnly) {
            query = query.eq('is_acknowledged', false);
        }
        
        const { data, error } = await query.order('detected_date', { ascending: false });
        
        if (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
        return data || [];
    },

    async acknowledgeAlert(alertId, userId) {
        const { error } = await supabase
            .from('regression_alerts')
            .update({
                is_acknowledged: true,
                acknowledged_by_id: userId,
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', alertId);
        
        if (error) {
            console.error('Error acknowledging alert:', error);
            return false;
        }
        return true;
    },

    async recordAction(alertId, actionTaken, followUpDate) {
        const { error } = await supabase
            .from('regression_alerts')
            .update({
                action_taken: actionTaken,
                follow_up_date: followUpDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', alertId);
        
        if (error) {
            console.error('Error recording action:', error);
            return false;
        }
        return true;
    },

    async renderAlerts(childId, containerId) {
        const alerts = await this.getAlerts(childId, true);
        
        if (alerts.length === 0) {
            document.getElementById(containerId).innerHTML = `
                <div class="alerts-empty">
                    <p>✅ No alerts. Your child is progressing well!</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="alerts-container">
                <h2>⚠️ Progress Alerts</h2>
                ${alerts.map(alert => `
                    <div class="alert-card alert-${alert.severity}">
                        <div class="alert-header">
                            <h3>${alert.alert_type.replace(/_/g, ' ').toUpperCase()}</h3>
                            <span class="alert-severity">${alert.severity.toUpperCase()}</span>
                        </div>
                        <p class="alert-domain">Domain: ${alert.domain}</p>
                        <p class="alert-description">${alert.description}</p>
                        ${alert.baseline_value ? `
                            <div class="alert-values">
                                <span>Baseline: ${alert.baseline_value}</span>
                                <span>Current: ${alert.current_value}</span>
                                <span>Change: ${alert.change_percentage?.toFixed(1)}%</span>
                            </div>
                        ` : ''}
                        <p class="alert-action"><strong>Recommended:</strong> ${alert.recommended_action}</p>
                        <div class="alert-actions">
                            <button class="btn-small" onclick="RegressionAlerts.showActionModal('${alert.id}')">Record Action</button>
                            <button class="btn-small" onclick="RegressionAlerts.handleAcknowledge('${alert.id}')">Acknowledge</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById(containerId).innerHTML = html;
    },

    async handleAcknowledge(alertId) {
        const { data: { user } } = await supabase.auth.getUser();
        const result = await this.acknowledgeAlert(alertId, user.id);
        
        if (result) {
            alert('Alert acknowledged');
            location.reload();
        }
    },

    async showActionModal(alertId) {
        const { data: alert } = await supabase
            .from('regression_alerts')
            .select('*')
            .eq('id', alertId)
            .single();
        
        const html = `
            <div class="modal-content">
                <h2>Record Action for Alert</h2>
                <p>${alert.description}</p>
                <div class="form-group">
                    <label>Action Taken:</label>
                    <textarea id="actionTaken" rows="4" placeholder="Describe the action you took or plan to take..."></textarea>
                </div>
                <div class="form-group">
                    <label>Follow-up Date:</label>
                    <input type="date" id="followUpDate">
                </div>
                <button class="btn-primary" onclick="RegressionAlerts.handleRecordAction('${alertId}')">Save Action</button>
            </div>
        `;
        
        showModal(html);
    },

    async handleRecordAction(alertId) {
        const actionTaken = document.getElementById('actionTaken').value;
        const followUpDate = document.getElementById('followUpDate').value;
        
        if (!actionTaken || !followUpDate) {
            alert('Please fill in all fields');
            return;
        }
        
        const result = await this.recordAction(alertId, actionTaken, followUpDate);
        
        if (result) {
            alert('Action recorded successfully');
            closeModal();
            location.reload();
        }
    }
};
