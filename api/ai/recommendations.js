// ============================================================
// NEUROSARATHI PHASE 2 - CLAUDE API INTEGRATION
// Backend endpoint for AI-powered activity recommendations
// Place this in your API routes (e.g., /api/ai/recommendations.js)
// ============================================================

// Node.js/Express endpoint
// POST /api/ai/recommendations

const Anthropic = require('@anthropic-ai/sdk');

exports.generateRecommendations = async (req, res) => {
    try {
        const { child_data, num_recommendations = 5 } = req.body;

        // Validate request
        if (!child_data) {
            return res.status(400).json({ error: 'Missing child_data' });
        }

        // Initialize Anthropic client
        const client = new Anthropic();

        // Build comprehensive prompt
        const prompt = buildPrompt(child_data, num_recommendations);

        // Call Claude API
        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // Parse response
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const recommendations = parseRecommendations(responseText);

        res.json({
            success: true,
            recommendations: recommendations,
            model_used: 'claude-3-5-sonnet-20241022',
            usage: {
                input_tokens: message.usage.input_tokens,
                output_tokens: message.usage.output_tokens
            }
        });

    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({
            error: 'Failed to generate recommendations',
            details: error.message
        });
    }
};

function buildPrompt(childData, numRecommendations) {
    const { child_name, age_months, developmental_conditions, recent_progress, active_goals, milestones, target_goal_id } = childData;

    const ageYears = (age_months / 12).toFixed(1);
    const conditionsList = developmental_conditions.length > 0 ? developmental_conditions.join(', ') : 'none specified';
    const progressSummary = recent_progress.length > 0 
        ? `Recent measurements: ${recent_progress.slice(0, 3).map(p => `${p.domain}: ${p.measurement_value} ${p.measurement_unit}`).join('; ')}`
        : 'No recent measurements';
    const goalsList = active_goals.length > 0 
        ? active_goals.map(g => `${g.title} (${g.domain})`).join('; ')
        : 'No active goals';

    return `You are a pediatric developmental specialist creating personalized activity recommendations for a child.

CHILD PROFILE:
- Name: ${child_name}
- Age: ${ageYears} years (${age_months} months)
- Developmental Conditions: ${conditionsList}
- Progress Data: ${progressSummary}
- Active Therapy Goals: ${goalsList}
- Recent Milestones: ${milestones.length > 0 ? milestones.slice(0, 2).map(m => m.milestone_name).join('; ') : 'None recorded'}

TASK:
Generate ${numRecommendations} evidence-based, actionable activity recommendations that:
1. Support the child's active therapy goals
2. Are age-appropriate and developmentally sound
3. Can be done at home or in community settings
4. Include clear instructions parents can understand
5. Have research backing (even if summarized)

For EACH recommendation, provide:
- title: Clear, parent-friendly activity name
- description: 2-3 sentence explanation of the activity
- frequency: How often to do it (e.g., "3x weekly", "daily")
- duration: Time needed per session (in minutes)
- difficulty: "easy", "medium", or "hard"
- domain: Which developmental area (communication, social, cognitive, motor_fine, motor_gross, self_care)
- evidence: Brief explanation of why this activity helps
- efficacy: Estimated effectiveness score 1-10

Format your response as a JSON array with exactly ${numRecommendations} recommendations.
Use this exact structure:
[
  {
    "title": "Activity Name",
    "description": "Clear description",
    "frequency": "3x weekly",
    "duration": 20,
    "difficulty": "easy",
    "domain": "communication",
    "evidence": "This activity supports...",
    "efficacy": 8
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.`;
}

function parseRecommendations(responseText) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON array found in response');
            return [];
        }

        const recommendations = JSON.parse(jsonMatch[0]);
        
        // Validate and clean recommendations
        return recommendations.filter(r => 
            r.title && r.description && r.frequency && r.duration && 
            r.difficulty && r.domain && r.evidence
        ).map(r => ({
            title: r.title.trim(),
            description: r.description.trim(),
            frequency: r.frequency.trim(),
            duration: parseInt(r.duration) || 20,
            difficulty: ['easy', 'medium', 'hard'].includes(r.difficulty.toLowerCase()) ? r.difficulty.toLowerCase() : 'medium',
            domain: r.domain.trim(),
            evidence: r.evidence.trim(),
            efficacy: Math.min(10, Math.max(1, parseInt(r.efficacy) || 7))
        }));

    } catch (error) {
        console.error('Error parsing recommendations:', error);
        return [];
    }
}

// Alternative: Fetch-based implementation for Vercel/Serverless
exports.generateRecommendationsFunction = async (req) => {
    try {
        const { child_data, num_recommendations = 5 } = await req.json();

        const prompt = buildPrompt(child_data, num_recommendations);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.content[0].text;
        const recommendations = parseRecommendations(responseText);

        return new Response(JSON.stringify({
            success: true,
            recommendations: recommendations
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to generate recommendations',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

module.exports = {
    generateRecommendations,
    generateRecommendationsFunction
};
