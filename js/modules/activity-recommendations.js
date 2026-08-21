// ============================================================
// NEUROSARATHI PHASE 2 - ACTIVITY RECOMMENDATIONS MODULE
// AI-powered activity recommendations using Claude API
// ============================================================

const ActivityRecommendations = {
    // Claude API endpoint (backend)
    apiEndpoint: '/api/ai/recommendations',
    
    async generateRecommendations(childId, parentId, goalId = null) {
        // Get child info
        const { data: child, error: childError } = await supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();
        
        if (childError) {
            console.error('Error fetching child:', childError);
            return null;
        }
        
        // Get child's progress data
        const { data: progress, error: progressError } = await supabase
            .from('growth_tracking')
            .select('*')
            .eq('child_id', childId)
            .order('measurement_date', { ascending: false })
            .limit(10);
        
        if (progressError) {
            console.error('Error fetching progress:', progressError);
            return null;
        }
        
        // Get child's current goals
        const { data: goals, error: goalsError } = await supabase
            .from('therapy_goals')
            .select('*')
            .eq('child_id', childId)
            .eq('status', 'active');
        
        if (goalsError) {
            console.error('Error fetching goals:', goalsError);
            return null;
        }
        
        // Get child's developmental milestones
        const { data: milestones, error: milestonesError } = await supabase
            .from('developmental_milestones')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (milestonesError) {
            console.error('Error fetching milestones:', milestonesError);
            return null;
        }
        
        // Call Claude API to generate recommendations
        const recommendations = await this.callClaudeAPI({
            child_name: child.name,
            age_months: this.calculateAgeInMonths(child.date_of_birth),
            developmental_conditions: child.conditions || [],
            recent_progress: progress,
            active_goals: goals,
            milestones: milestones,
            target_goal_id: goalId
        });
        
        if (!recommendations) {
            console.error('Failed to generate recommendations');
            return null;
        }
        
        // Save recommendations to database
        const savedRecommendations = [];
        for (const rec of recommendations) {
            const { data, error } = await supabase
                .from('activity_recommendations')
                .insert([{
                    child_id: childId,
                    parent_id: parentId,
                    goal_id: goalId,
                    activity_title: rec.title,
                    description: rec.description,
                    recommended_frequency: rec.frequency,
                    duration_minutes: rec.duration,
                    difficulty_level: rec.difficulty,
                    domain: rec.domain,
                    ai_generated: true,
                    ai_model_used: 'claude-3-5-sonnet-20241022',
                    evidence_basis: rec.evidence,
                    efficacy_score: rec.efficacy || 7
                }])
                .select();
            
            if (!error && data) {
                savedRecommendations.push(data[0]);
            }
        }
        
        return savedRecommendations;
    },

    async callClaudeAPI(childData) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    child_data: childData,
                    num_recommendations: 5
                })
            });
            
            if (!response.ok) {
                console.error('API error:', response.status);
                return null;
            }
            
            const data = await response.json();
            return data.recommendations || null;
        } catch (error) {
            console.error('Error calling Claude API:', error);
            return null;
        }
    },

    calculateAgeInMonths(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
        months += today.getMonth() - birthDate.getMonth();
        return months;
    },

    async getAuthToken() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            console.error('No active session');
            return null;
        }
        return session.access_token;
    },

    async getRecommendations(childId, limit = 10) {
        const { data, error } = await supabase
            .from('activity_recommendations')
            .select('*')
            .eq('child_id', childId)
            .eq('parent_feedback', null)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Error fetching recommendations:', error);
            return [];
        }
        return data || [];
    },

    async recordFeedback(recommendationId, feedback, notes = null) {
        const { error } = await supabase
            .from('activity_recommendations')
            .update({
                parent_feedback: feedback,
                feedback_notes: notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', recommendationId);
        
        if (error) {
            console.error('Error recording feedback:', error);
            return false;
        }
        return true;
    },

    async renderRecommendations(childId, containerId) {
        const recommendations = await this.getRecommendations(childId);
        
        if (recommendations.length === 0) {
            document.getElementById(containerId).innerHTML = `
                <div class="recommendations-empty">
                    <p>No recommendations yet. Click "Generate Recommendations" to get started.</p>
                    <button class="btn-primary" onclick="ActivityRecommendations.handleGenerateClick(event)">Generate Recommendations</button>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="recommendations-container">
                <h2>Recommended Activities</h2>
                ${recommendations.map(rec => `
                    <div class="recommendation-card">
                        <h3>${rec.activity_title}</h3>
                        <p class="domain-tag">${rec.domain}</p>
                        <p class="description">${rec.description}</p>
                        <div class="recommendation-details">
                            <span class="frequency">📅 ${rec.recommended_frequency}</span>
                            <span class="duration">⏱️ ${rec.duration_minutes} mins</span>
                            <span class="difficulty">${this.getDifficultyBadge(rec.difficulty_level)}</span>
                        </div>
                        <p class="evidence"><strong>Why:</strong> ${rec.evidence_basis}</p>
                        <div class="feedback-section">
                            <label>Is this helpful?</label>
                            <button class="btn-small" onclick="ActivityRecommendations.submitFeedback('${rec.id}', 'helpful')">✅ Helpful</button>
                            <button class="btn-small" onclick="ActivityRecommendations.submitFeedback('${rec.id}', 'partially_helpful')">⚠️ Somewhat</button>
                            <button class="btn-small" onclick="ActivityRecommendations.submitFeedback('${rec.id}', 'not_helpful')">❌ Not helpful</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById(containerId).innerHTML = html;
    },

    getDifficultyBadge(difficulty) {
        const badges = {
            'easy': '🟢 Easy',
            'medium': '🟡 Medium',
            'hard': '🔴 Hard'
        };
        return badges[difficulty] || difficulty;
    },

    async submitFeedback(recommendationId, feedback) {
        const result = await this.recordFeedback(recommendationId, feedback);
        if (result) {
            alert('Thank you for your feedback!');
            // Reload recommendations
            const childId = new URLSearchParams(window.location.search).get('child_id');
            if (childId) {
                await this.renderRecommendations(childId, 'recommendations-container');
            }
        }
    },

    async handleGenerateClick(event) {
        event.preventDefault();
        const childId = new URLSearchParams(window.location.search).get('child_id');
        if (!childId) {
            alert('Child ID not found');
            return;
        }
        
        // Show loading
        alert('Generating AI-powered recommendations... This may take a moment.');
        
        const { data: { user } } = await supabase.auth.getUser();
        const result = await this.generateRecommendations(childId, user.id);
        
        if (result) {
            alert('Recommendations generated successfully!');
            await this.renderRecommendations(childId, 'recommendations-container');
        } else {
            alert('Failed to generate recommendations');
        }
    }
};
