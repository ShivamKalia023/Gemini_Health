document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('id');

    if (!activityId) {
        alert('No activity ID specified.');
        window.location.href = 'home.html';
        return;
    }

    try {
        const res = await fetch(`/api/dashboard/activities/${activityId}`);
        if (!res.ok) {
            throw new Error('Activity not found');
        }
        const data = await res.json();
        renderActivityDetails(data.activity, data.ctl, data.atl, data.tsb, data.trainingStatus);
    } catch (err) {
        console.error('Error loading activity:', err);
        document.querySelector('.activity-details-container').innerHTML = `
            <a href="home.html" class="back-link">&larr; Back to Dashboard</a>
            <div style="padding: 40px; text-align: center; background: #fff; border: 1px solid #ddd; border-radius: 8px; color: red; font-weight: bold;">
                Failed to load activity details. It may not exist.
            </div>
        `;
    }
});

function formatDuration(seconds) {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}h ${m}m`;
    }
    if (m > 0) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}

function renderActivityDetails(act, ctl, atl, tsb, trainingStatus) {
    const isRun = act.type && act.type.toLowerCase().includes('run');
    const isRide = act.type && act.type.toLowerCase().includes('ride');
    
    // Set athlete attribution and back link
    const athleteName = act.athlete ? act.athlete.name : 'Unknown Athlete';
    const athleteAttr = document.getElementById('athlete-attribution');
    if (athleteAttr && act.athlete) {
        athleteAttr.innerHTML = `by <a href="profile.html?id=${act.athlete.id}" style="color: var(--color-orange); text-decoration: none; font-weight: 700;">${athleteName}</a>`;
        
        // Update back link
        const backLink = document.getElementById('back-link');
        if (backLink) {
            backLink.href = `profile.html?id=${act.athlete.id}`;
            backLink.textContent = `← Back to ${athleteName}'s Profile`;
        }
    }

    // Set page title
    document.title = `GFG Tracker - ${act.name}`;

    // Set name, type, date
    document.getElementById('activity-name').textContent = act.name;
    document.getElementById('badge-text').textContent = act.type || 'Workout';
    
    // Icon badge
    const badgeSpan = document.querySelector('#activity-type-badge span');
    if (badgeSpan) {
        badgeSpan.textContent = isRun ? '🏃' : (isRide ? '🚴' : '💪');
    }

    const startDate = new Date(act.startDate);
    document.getElementById('activity-date').textContent = startDate.toLocaleString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // Distance
    const distanceVal = act.distance ? act.distance.toFixed(2) : '0.00';
    document.getElementById('summary-dist').textContent = distanceVal;

    // Moving & Elapsed time
    document.getElementById('summary-time').textContent = formatDuration(act.movingTime);
    document.getElementById('stat-elapsed-time').textContent = formatDuration(act.elapsedTime);

    // Elevation
    document.getElementById('summary-elev').textContent = act.totalElevationGain ? Math.round(act.totalElevationGain) : '0';

    // Average Pace / Speed formatting
    let paceOrSpeedStr = '--';
    if (act.distance > 0 && act.movingTime > 0) {
        if (isRun) {
            // Minutes per km
            const paceSecs = act.movingTime / act.distance;
            const pM = Math.floor(paceSecs / 60);
            const pS = Math.floor(paceSecs % 60);
            paceOrSpeedStr = `${pM}:${pS.toString().padStart(2, '0')} /km`;
        } else {
            // Speed in km/h
            const speed = act.distance / (act.movingTime / 3600.0);
            paceOrSpeedStr = `${speed.toFixed(1)} km/h`;
        }
    }
    document.getElementById('summary-pace').textContent = paceOrSpeedStr;

    // Stats table values
    document.getElementById('stat-avg-hr').textContent = act.averageHr || '--';
    document.getElementById('stat-max-hr').textContent = act.maxHr || '--';
    document.getElementById('stat-trimp').textContent = act.trimp || '--';

    // Average Speed (km/h)
    if (act.averageSpeed) {
        document.getElementById('stat-avg-speed').textContent = act.averageSpeed.toFixed(1);
    } else if (act.distance > 0 && act.movingTime > 0) {
        const calculatedSpeed = act.distance / (act.movingTime / 3600.0);
        document.getElementById('stat-avg-speed').textContent = calculatedSpeed.toFixed(1);
    } else {
        document.getElementById('stat-avg-speed').textContent = '0.0';
    }

    // Average Watts
    document.getElementById('stat-avg-watts').textContent = act.averageWatts ? act.averageWatts.toFixed(0) : '--';

    // Source description
    let sourceText = 'Manual Import';
    if (act.stravaActivityId) {
        if (act.stravaActivityId.includes('_mock_')) {
            sourceText = 'Simulated History';
        } else if (act.stravaActivityId.includes('_gpx_')) {
            sourceText = 'GPX Upload';
        } else if (/^\d+$/.test(act.stravaActivityId)) {
            sourceText = 'Strava API Sync';
        } else {
            sourceText = 'CSV Data Upload';
        }
    }
    document.getElementById('stat-source').textContent = sourceText;

    // Calories Estimation
    let weight = act.athlete && act.athlete.weight ? act.athlete.weight : 70.0;
    let calories = '--';
    if (act.distance > 0) {
        if (isRun) {
            calories = Math.round(weight * act.distance * 1.03);
        } else if (isRide) {
            calories = Math.round(weight * act.distance * 0.28);
        } else {
            calories = Math.round(weight * act.distance * 0.8);
        }
    } else if (act.movingTime > 0) {
        // Fallback for gym workouts (approx 6 kcal/min)
        calories = Math.round((act.movingTime / 60.0) * 6.0);
    }
    document.getElementById('stat-calories').textContent = calories;

    // Set CTL, ATL, TSB, Status
    document.getElementById('stat-ctl').textContent = ctl !== undefined && ctl !== null ? ctl : '--';
    document.getElementById('stat-atl').textContent = atl !== undefined && atl !== null ? atl : '--';
    document.getElementById('stat-tsb').textContent = tsb !== undefined && tsb !== null ? tsb : '--';
    document.getElementById('stat-training-status').textContent = trainingStatus || '--';

    // Parse stream and render charts if streamJson exists
    if (act.streamJson && act.streamJson.trim().length > 0) {
        try {
            const stream = JSON.parse(act.streamJson);
            if (Array.isArray(stream) && stream.length > 0) {
                renderStreamCharts(stream);
            }
        } catch (e) {
            console.error('Failed to parse activity stream JSON:', e);
        }
    }
}

function renderStreamCharts(stream) {
    const distances = stream.map(pt => pt.dist || 0);
    const elevations = stream.map(pt => pt.elev || 0);
    const heartrates = stream.map(pt => pt.hr || null).filter(hr => hr !== null);

    // 1. Elevation Chart
    if (elevations.some(el => el > 0)) {
        const elCard = document.getElementById('chart-card-elevation');
        elCard.classList.remove('hidden');
        const ctx = document.getElementById('elevationProfileChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: distances.map(d => d.toFixed(2) + ' km'),
                datasets: [{
                    label: 'Elevation',
                    data: elevations,
                    borderColor: '#ca8a04',
                    backgroundColor: 'rgba(202, 138, 4, 0.06)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { maxTicksLimit: 8, color: '#888' }, grid: { display: false } },
                    y: { ticks: { color: '#888' }, grid: { color: '#f3f4f6' } }
                }
            }
        });
    }

    // 2. Heart Rate Chart
    if (heartrates.length > 0) {
        const hrCard = document.getElementById('chart-card-hr');
        hrCard.classList.remove('hidden');
        const ctx = document.getElementById('hrProfileChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: stream.filter(pt => pt.hr).map(pt => (pt.dist || 0).toFixed(2) + ' km'),
                datasets: [{
                    label: 'Heart Rate',
                    data: heartrates,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.05)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { maxTicksLimit: 8, color: '#888' }, grid: { display: false } },
                    y: { ticks: { color: '#888' }, grid: { color: '#f3f4f6' } }
                }
            }
        });
    }
}
