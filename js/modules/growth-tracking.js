// ============================================================
// NEUROSARATHI PHASE 2 - GROWTH TRACKING MODULE
// Track child developmental progress measurements over time
// ============================================================

const GrowthTracking = {
    domains: ['communication', 'social', 'cognitive', 'motor_fine', 'motor_gross', 'self_care'],
    
    async loadGrowthData(childId) {
        const { data, error } = await supabase
            .from('growth_tracking')
            .select('*')
            .eq('child_id', childId)
            .order('measurement_date', { ascending: true });
        
        if (error) {
            console.error('Error loading growth data:', error);
            return [];
        }
        return data || [];
    },

    async addMeasurement(childId, parentId, domain, value, unit, date, notes, confidenceLevel) {
        const { data, error } = await supabase
            .from('growth_tracking')
            .insert([{
                child_id: childId,
                parent_id: parentId,
                domain: domain,
                measurement_value: value,
                measurement_unit: unit,
                measurement_date: date,
                notes: notes,
                confidence_level: confidenceLevel || 8
            }])
            .select();
        
        if (error) {
            console.error('Error adding measurement:', error);
            return null;
        }
        
        // Update trajectory
        await GrowthTrajectories.calculateTrajectory(childId, domain);
        
        return data[0];
    },

    async getProgressByDomain(childId, domain, startDate, endDate) {
        let query = supabase
            .from('growth_tracking')
            .select('*')
            .eq('child_id', childId)
            .eq('domain', domain);
        
        if (startDate) query = query.gte('measurement_date', startDate);
        if (endDate) query = query.lte('measurement_date', endDate);
        
        const { data, error } = await query.order('measurement_date', { ascending: true });
        
        if (error) {
            console.error('Error getting progress:', error);
            return [];
        }
        return data || [];
    },

    async getLatestMeasurement(childId, domain) {
        const { data, error } = await supabase
            .from('growth_tracking')
            .select('*')
            .eq('child_id', childId)
            .eq('domain', domain)
            .order('measurement_date', { ascending: false })
            .limit(1);
        
        if (error) return null;
        return data && data.length > 0 ? data[0] : null;
    },

    async calculateProgressRate(childId, domain, monthsBack = 3) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        
        const measurements = await this.getProgressByDomain(childId, domain, startDate.toISOString().split('T')[0]);
        
        if (measurements.length < 2) return null;
        
        const first = measurements[0];
        const last = measurements[measurements.length - 1];
        
        const date1 = new Date(first.measurement_date);
        const date2 = new Date(last.measurement_date);
        const monthsDiff = (date2 - date1) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsDiff === 0) return null;
        
        return (last.measurement_value - first.measurement_value) / monthsDiff;
    },

    async showAddModal(childId, parentId) {
        const html = `
            <div class="modal-content">
                <h2>Record Growth Measurement</h2>
                <div class="form-group">
                    <label>Domain:</label>
                    <select id="domainSelect">
                        ${this.domains.map(d => `<option value="${d}">${d.replace(/_/g, ' ')}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Measurement:</label>
                    <input type="number" id="valueInput" placeholder="e.g., 45 words, 2.5 meters">
                </div>
                <div class="form-group">
                    <label>Unit:</label>
                    <input type="text" id="unitInput" placeholder="words, meters, percentage, score">
                </div>
                <div class="form-group">
                    <label>Date:</label>
                    <input type="date" id="dateInput">
                </div>
                <div class="form-group">
                    <label>Notes (optional):</label>
                    <textarea id="notesInput" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Confidence Level (1-10):</label>
                    <input type="range" id="confidenceInput" min="1" max="10" value="8">
                    <span id="confidenceValue">8</span>
                </div>
                <button class="btn-primary" onclick="GrowthTracking.handleAddMeasurement('${childId}', '${parentId}')">Add Measurement</button>
            </div>
        `;
        
        showModal(html);
    },

    async handleAddMeasurement(childId, parentId) {
        const domain = document.getElementById('domainSelect').value;
        const value = parseFloat(document.getElementById('valueInput').value);
        const unit = document.getElementById('unitInput').value;
        const date = document.getElementById('dateInput').value;
        const notes = document.getElementById('notesInput').value;
        const confidence = parseInt(document.getElementById('confidenceInput').value);
        
        if (!domain || !value || !unit || !date) {
            alert('Please fill in all required fields');
            return;
        }
        
        const result = await this.addMeasurement(childId, parentId, domain, value, unit, date, notes, confidence);
        
        if (result) {
            alert('Measurement recorded successfully');
            closeModal();
            location.reload();
        }
    }
};

// Chart initialization for growth visualization
async function initGrowthCharts(childId) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    const domains = GrowthTracking.domains;
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    const datasets = await Promise.all(
        domains.map(async (domain, idx) => {
            const data = await GrowthTracking.getProgressByDomain(childId, domain);
            return {
                label: domain.replace(/_/g, ' '),
                data: data.map(d => ({x: d.measurement_date, y: d.measurement_value})),
                borderColor: colors[idx],
                backgroundColor: colors[idx] + '20',
                tension: 0.4
            };
        })
    );
    
    new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Growth Progress Over Time' },
                legend: { display: true }
            },
            scales: {
                x: { type: 'time', time: { unit: 'month' } }
            }
        }
    });
}
