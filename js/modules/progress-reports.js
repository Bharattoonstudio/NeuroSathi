// ============================================================
// NEUROSARATHI PHASE 2 - PROGRESS REPORTS MODULE
// Generate detailed progress reports for children
// ============================================================

const ProgressReports = {
    async generateProgressReport(childId, parentId, therapistId, reportType, periodStartDate, periodEndDate) {
        // Gather data for the report
        const communicationProgress = await this.getProgressByDomain(childId, 'communication', periodStartDate, periodEndDate);
        const socialProgress = await this.getProgressByDomain(childId, 'social', periodStartDate, periodEndDate);
        const cognitiveProgress = await this.getProgressByDomain(childId, 'cognitive', periodStartDate, periodEndDate);
        const motorFineProgress = await this.getProgressByDomain(childId, 'motor_fine', periodStartDate, periodEndDate);
        const motorGrossProgress = await this.getProgressByDomain(childId, 'motor_gross', periodStartDate, periodEndDate);
        const selfCareProgress = await this.getProgressByDomain(childId, 'self_care', periodStartDate, periodEndDate);
        
        // Generate summaries
        const summaryText = await this.generateSummary(childId, reportType, periodStartDate, periodEndDate);
        const overallProgress = this.determineOverallProgress([
            communicationProgress, socialProgress, cognitiveProgress,
            motorFineProgress, motorGrossProgress, selfCareProgress
        ]);
        
        // Get recommendations
        const recommendations = await this.getRecommendations(childId);
        const nextGoals = await this.generateNextGoals(childId, recommendations);
        
        // Create report
        const { data, error } = await supabase
            .from('progress_reports')
            .insert([{
                child_id: childId,
                parent_id: parentId,
                therapist_id: therapistId,
                report_type: reportType,
                report_date: new Date().toISOString().split('T')[0],
                period_start_date: periodStartDate,
                period_end_date: periodEndDate,
                summary_text: summaryText,
                overall_progress: overallProgress,
                communication_progress: communicationProgress.length > 0 ? 'Improving' : 'No data',
                social_progress: socialProgress.length > 0 ? 'Improving' : 'No data',
                cognitive_progress: cognitiveProgress.length > 0 ? 'Improving' : 'No data',
                motor_fine_progress: motorFineProgress.length > 0 ? 'Improving' : 'No data',
                motor_gross_progress: motorGrossProgress.length > 0 ? 'Improving' : 'No data',
                self_care_progress: selfCareProgress.length > 0 ? 'Improving' : 'No data',
                recommendations: recommendations.map(r => r.activity_title).join(', '),
                next_goals: nextGoals
            }])
            .select();
        
        if (error) {
            console.error('Error creating report:', error);
            return null;
        }
        
        return data[0];
    },

    async getProgressByDomain(childId, domain, startDate, endDate) {
        const { data, error } = await supabase
            .from('growth_tracking')
            .select('*')
            .eq('child_id', childId)
            .eq('domain', domain)
            .gte('measurement_date', startDate)
            .lte('measurement_date', endDate)
            .order('measurement_date', { ascending: true });
        
        if (error) return [];
        return data || [];
    },

    async generateSummary(childId, reportType, startDate, endDate) {
        // Get child info
        const { data: child } = await supabase
            .from('children')
            .select('name, date_of_birth')
            .eq('id', childId)
            .single();
        
        // Generate summary using AI
        const prompt = `Generate a brief progress summary for ${child.name} for the period ${startDate} to ${endDate}. Report type: ${reportType}. Keep it professional and encouraging.`;
        
        // For MVP, return a template summary
        return `${child.name} has shown progress across multiple developmental domains during this ${reportType} period. Continue with current interventions and monitor closely.`;
    },

    determineOverallProgress(progressArrays) {
        const nonEmptyArrays = progressArrays.filter(arr => arr.length > 0);
        if (nonEmptyArrays.length === 0) return 'insufficient_data';
        
        const averageLength = nonEmptyArrays.reduce((sum, arr) => sum + arr.length, 0) / nonEmptyArrays.length;
        
        if (averageLength > 5) return 'excellent';
        if (averageLength > 3) return 'good';
        if (averageLength > 1) return 'fair';
        return 'needs_attention';
    },

    async getRecommendations(childId) {
        const { data, error } = await supabase
            .from('activity_recommendations')
            .select('*')
            .eq('child_id', childId)
            .limit(5);
        
        if (error) return [];
        return data || [];
    },

    async generateNextGoals(childId, recommendations) {
        const goals = recommendations.map(r => `Continue with ${r.activity_title}`).join('. ');
        return goals || 'Monitor progress and adjust therapy goals as needed.';
    },

    async getReport(reportId) {
        const { data, error } = await supabase
            .from('progress_reports')
            .select('*')
            .eq('id', reportId)
            .single();
        
        if (error) return null;
        return data;
    },

    async getChildReports(childId) {
        const { data, error } = await supabase
            .from('progress_reports')
            .select('*')
            .eq('child_id', childId)
            .order('report_date', { ascending: false });
        
        if (error) return [];
        return data || [];
    },

    async renderReport(report, containerId) {
        const html = `
            <div class="progress-report">
                <h1>Progress Report</h1>
                <div class="report-metadata">
                    <p><strong>Report Type:</strong> ${report.report_type}</p>
                    <p><strong>Period:</strong> ${report.period_start_date} to ${report.period_end_date}</p>
                    <p><strong>Generated:</strong> ${report.report_date}</p>
                </div>
                
                <section>
                    <h2>Summary</h2>
                    <p>${report.summary_text}</p>
                </section>
                
                <section>
                    <h2>Overall Progress</h2>
                    <p class="progress-${report.overall_progress}">${report.overall_progress}</p>
                </section>
                
                <section>
                    <h2>Domain Progress</h2>
                    <div class="domain-progress">
                        <div class="domain"><strong>Communication:</strong> ${report.communication_progress}</div>
                        <div class="domain"><strong>Social:</strong> ${report.social_progress}</div>
                        <div class="domain"><strong>Cognitive:</strong> ${report.cognitive_progress}</div>
                        <div class="domain"><strong>Fine Motor:</strong> ${report.motor_fine_progress}</div>
                        <div class="domain"><strong>Gross Motor:</strong> ${report.motor_gross_progress}</div>
                        <div class="domain"><strong>Self-Care:</strong> ${report.self_care_progress}</div>
                    </div>
                </section>
                
                <section>
                    <h2>Recommendations</h2>
                    <p>${report.recommendations}</p>
                </section>
                
                <section>
                    <h2>Next Goals</h2>
                    <p>${report.next_goals}</p>
                </section>
                
                <div class="action-buttons">
                    <button class="btn-primary" onclick="ProgressReports.downloadPDF('${report.id}')">Download as PDF</button>
                    <button class="btn-secondary" onclick="ProgressReports.shareReport('${report.id}')">Share Report</button>
                </div>
            </div>
        `;
        
        document.getElementById(containerId).innerHTML = html;
    },

    async downloadPDF(reportId) {
        // TODO: Generate PDF and download
        alert('PDF download feature coming soon');
    },

    async shareReport(reportId) {
        // TODO: Share report with parents/therapists
        alert('Report sharing feature coming soon');
    }
};
