// Charting Helpers for Gemini Fitness Group Tracker (Light Theme)

function initPerformanceChart(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Fitness (CTL)',
                    data: [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Fatigue (ATL)',
                    data: [],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.03)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    tension: 0.3,
                    borderDash: [4, 4]
                },
                {
                    label: 'Form (TSB)',
                    data: [],
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.06)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#6b7280', font: { size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                }
            }
        }
    });
}

function initZonesChart(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Zone 1 (Recovery)', 'Zone 2 (Aerobic)', 'Zone 3 (Tempo)', 'Zone 4 (Threshold)', 'Zone 5 (Anaerobic)'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#94a3b8', '#16a34a', '#ca8a04', '#e95420', '#dc2626'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#6b7280', font: { size: 11 }, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} mins`;
                        }
                    }
                }
            }
        }
    });
}

function updatePerformanceChart(chart, timeline) {
    if (!timeline || timeline.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.data.datasets[1].data = [];
        chart.data.datasets[2].data = [];
        chart.update();
        return;
    }
    chart.data.labels = timeline.map(pt => {
        const d = new Date(pt.date);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    chart.data.datasets[0].data = timeline.map(pt => pt.fitness);
    chart.data.datasets[1].data = timeline.map(pt => pt.fatigue);
    chart.data.datasets[2].data = timeline.map(pt => pt.form);
    chart.update();
}

function updateZonesChart(chart, zones) {
    if (!zones) {
        chart.data.datasets[0].data = [0, 0, 0, 0, 0];
        chart.update();
        return;
    }
    chart.data.datasets[0].data = [
        zones['Zone 1 (Recovery)'] || 0,
        zones['Zone 2 (Aerobic)'] || 0,
        zones['Zone 3 (Tempo)'] || 0,
        zones['Zone 4 (Threshold)'] || 0,
        zones['Zone 5 (Anaerobic)'] || 0
    ];
    chart.update();
}
