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
                    label: 'Daily Activity',
                    data: [],
                    borderColor: '#e95420',
                    backgroundColor: 'rgba(233, 84, 32, 0.06)',
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointBackgroundColor: '#e95420',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#f97316',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2,
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
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    titleFont: { size: 12, weight: 'bold', family: "'Outfit', sans-serif" },
                    bodyColor: '#e2e8f0',
                    bodyFont: { size: 11, family: "'Inter', sans-serif" },
                    borderColor: 'rgba(233, 84, 32, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const point = context[0].chart.data.datasets[0].rawTimelineData[dataIndex];
                            if (point) {
                                // Add 12 hours to avoid timezone shifting issues
                                const d = new Date(point.date + 'T12:00:00');
                                return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                            }
                            return '';
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const point = context.chart.data.datasets[0].rawTimelineData[dataIndex];
                            if (!point) return '';

                            const lines = [];
                            if (point.activityCount > 0) {
                                lines.push(`🏃 Activities: ${point.activityCount}`);
                                lines.push(`📏 Distance: ${point.totalDistance.toFixed(1)} km`);
                                
                                const durH = Math.floor(point.totalMovingTime / 3600);
                                const durM = Math.floor((point.totalMovingTime % 3600) / 60);
                                const timeStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
                                lines.push(`⏳ Duration: ${timeStr}`);
                                
                                if (point.totalElevationGain > 0) {
                                    lines.push(`🏔️ Elevation: ${Math.round(point.totalElevationGain)} m`);
                                }
                            } else {
                                lines.push('😴 Status: Rest Day');
                            }
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10, family: "'Inter', sans-serif" }, maxTicksLimit: 12 }
                },
                y: {
                    min: 0,
                    max: 1.2,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            if (value === 0) return 'Rest';
                            if (value === 1) return 'Active';
                            return '';
                        },
                        color: '#94a3b8',
                        font: { size: 10, family: "'Inter', sans-serif", weight: '600' }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' }
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
        chart.data.datasets[0].rawTimelineData = [];
        chart.update();
        return;
    }
    
    chart.data.labels = timeline.map(pt => {
        // Add 12 hours to avoid timezone shifts
        const d = new Date(pt.date + 'T12:00:00');
        if (timeline.length <= 7) {
            return d.toLocaleDateString(undefined, { weekday: 'short' });
        } else {
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
    });
    
    chart.data.datasets[0].rawTimelineData = timeline;
    chart.data.datasets[0].data = timeline.map(pt => pt.activityCount > 0 ? 1 : 0);
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
