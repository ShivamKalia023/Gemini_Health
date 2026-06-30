document.addEventListener('DOMContentLoaded', () => {
    let performanceChart = null;
    let zonesChart = null;

    const isAdmin = document.cookie.includes('admin_token=true');

    // Init charts
    performanceChart = initPerformanceChart('performanceChart');
    zonesChart = initZonesChart('zonesChart');

    // DOM Elements
    const adminControls = document.getElementById('admin-controls');
    const leaderboardList = document.getElementById('leaderboard-list');
    const globalFeedList = document.getElementById('global-feed-list');
    const stravaConnectBtn = document.getElementById('strava-connect-btn');
    
    // Champion Elements
    const championBanner = document.getElementById('champion-banner');
    const championAvatar = document.getElementById('champion-avatar');
    const championName = document.getElementById('champion-name');
    const championDist = document.getElementById('champion-dist');
    const championActs = document.getElementById('champion-acts');

    // Overlay Elements
    const athleteDashboardOverlay = document.getElementById('athlete-dashboard-overlay');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    const fileImportInput = document.getElementById('file-import-input');

    // Ticker Elements
    const lastUpdatedTicker = document.getElementById('last-updated-ticker');

    let currentAthleteId = null;

    if (isAdmin) {
        adminControls.classList.remove('hidden');
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    function updateTickerTime() {
        if (!lastUpdatedTicker) return;
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const text = `LAST UPDATED: ${timeString}`;
        // Duplicate text many times to ensure seamless infinite scroll
        let html = '';
        for (let i = 0; i < 10; i++) {
            html += `<span>${text}</span>`;
        }
        lastUpdatedTicker.innerHTML = html;
    }

    async function loadLeaderboard() {
        try {
            const res = await fetch('/api/dashboard/leaderboard');
            const data = await res.json();
            
            if (data.length === 0) {
                leaderboardList.innerHTML = '<tr><td colspan="4" class="loading-text">No athletes found.</td></tr>';
                return;
            }
            
            // 1. Populate Champion Banner
            const champ = data[0];
            championAvatar.src = champ.athlete.avatarUrl || '';
            championName.textContent = champ.athlete.name;
            championDist.innerHTML = `${champ.lastRunDistance ? champ.lastRunDistance.toFixed(1) : '0.0'} <span class="unit">km</span>`;
            championActs.textContent = champ.totalActivities || 0;
            championBanner.classList.remove('hidden');

            // 2. Populate Leaderboard Table
            leaderboardList.innerHTML = '';
            data.forEach((entry, idx) => {
                const rankNum = String(idx + 1).padStart(2, '0');
                const isTop = idx === 0 ? 'top-rank' : '';
                const dist = entry.lastRunDistance ? entry.lastRunDistance.toFixed(1) : '0.0';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="rank-cell ${isTop}">${rankNum}</td>
                    <td>
                        <div class="athlete-cell">
                            <img src="${entry.athlete.avatarUrl || ''}" alt="">
                            <div class="athlete-cell-info">
                                <span class="athlete-cell-name">${entry.athlete.name}</span>
                                <span class="athlete-cell-status">Strava Connected · ${entry.athlete.city || 'Unknown'}</span>
                            </div>
                        </div>
                    </td>
                    <td class="acts-cell">${entry.totalActivities || 0}</td>
                    <td class="value-cell">${dist} km</td>
                `;
                tr.addEventListener('click', () => openAthleteDashboard(entry.athlete));
                leaderboardList.appendChild(tr);
            });

        } catch (e) {
            console.error(e);
            leaderboardList.innerHTML = '<tr><td colspan="4" class="loading-text">Failed to load.</td></tr>';
        }
    }

    async function loadGlobalFeed() {
        try {
            const res = await fetch('/api/dashboard/feed');
            const data = await res.json();
            
            if (data.length === 0) {
                globalFeedList.innerHTML = '<div class="loading-text">No activities found.</div>';
                return;
            }
            
            globalFeedList.innerHTML = '';
            data.forEach(act => {
                // Determine 'time ago' string roughly
                const actDate = new Date(act.startDate);
                const diffTime = Math.abs(new Date() - actDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const timeAgo = diffDays > 0 ? `${diffDays}d ago` : 'Today';

                const dist = act.distance ? act.distance.toFixed(1) + ' km' : '';
                const durH = Math.floor(act.movingTime / 3600);
                const durM = Math.floor((act.movingTime % 3600) / 60);
                const timeStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
                
                const avatar = act.athlete && act.athlete.avatarUrl ? `<img src="${act.athlete.avatarUrl}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">` : `<div style="width:32px;height:32px;background:#ddd;border-radius:4px;"></div>`;
                
                const el = document.createElement('div');
                el.className = 'feed-item';
                el.innerHTML = `
                    <div style="margin-right: 12px;">${avatar}</div>
                    <div class="feed-item-content">
                        <div class="feed-title" style="margin-bottom: 4px;">
                            <strong>${act.athlete ? act.athlete.name : 'Unknown'}</strong> completed ${dist} · ${act.name}
                        </div>
                        <div class="feed-stats">
                            <span>${timeStr}</span>
                            ${act.totalElevationGain ? `<span>· ${Math.round(act.totalElevationGain)}m</span>` : ''}
                            <span>· ${timeAgo}</span>
                        </div>
                    </div>
                    <div class="feed-item-icon" style="background:transparent;">
                        ${act.type.toLowerCase().includes('run') ? '🏃' : (act.type.toLowerCase().includes('ride') ? '🚴' : '💪')}
                    </div>
                `;
                globalFeedList.appendChild(el);
            });
        } catch(e) {
            console.error(e);
            globalFeedList.innerHTML = '<div class="loading-text">Failed to load.</div>';
        }
    }

    async function openAthleteDashboard(athlete) {
        currentAthleteId = athlete.id;
        document.getElementById('athlete-avatar').src = athlete.avatarUrl || '';
        document.getElementById('athlete-name').textContent = athlete.name;
        document.getElementById('athlete-city').textContent = athlete.city || '--';
        document.getElementById('athlete-state').textContent = athlete.state || '';
        document.getElementById('athlete-country').textContent = athlete.country || '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        athleteDashboardOverlay.classList.remove('hidden');

        // Fetch Activities & Performance
        const [resAct, resPerf, resZones] = await Promise.all([
            fetch(`/api/athletes/${athlete.id}/activities`),
            fetch(`/api/athletes/${athlete.id}/performance`),
            fetch(`/api/athletes/${athlete.id}/zones`)
        ]);

        const activities = resAct.ok ? await resAct.json() : [];
        const timeline = resPerf.ok ? await resPerf.json() : [];
        const zones = resZones.ok ? await resZones.json() : {};

        // Calculate Weekly Dist
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        startOfWeek.setHours(0,0,0,0);
        let sum = 0;
        activities.forEach(a => {
            const d = new Date(a.startDate);
            if(d >= startOfWeek && d <= today) sum += (a.distance || 0);
        });
        document.getElementById('stat-weekly-dist').textContent = sum.toFixed(1);

        // Update timeline text
        if (timeline.length > 0) {
            const latest = timeline[timeline.length - 1];
            document.getElementById('stat-fitness').textContent = Math.round(latest.fitness);
            document.getElementById('stat-fatigue').textContent = Math.round(latest.fatigue);
            document.getElementById('stat-form').textContent = Math.round(latest.form);
        } else {
            document.getElementById('stat-fitness').textContent = '0';
            document.getElementById('stat-fatigue').textContent = '0';
            document.getElementById('stat-form').textContent = '0';
        }

        updatePerformanceChart(performanceChart, timeline);
        updateZonesChart(zonesChart, zones);
    }

    // --- Event Listeners ---

    closeDashboardBtn.addEventListener('click', () => {
        athleteDashboardOverlay.classList.add('hidden');
        currentAthleteId = null;
    });

    if (stravaConnectBtn) {
        stravaConnectBtn.addEventListener('click', () => {
            window.location.href = '/api/athletes/strava/login';
        });
    }

    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', async () => {
            if (!currentAthleteId) return;
            if (confirm('Are you sure you want to delete this profile?')) {
                const res = await fetch(`/api/athletes/${currentAthleteId}`, { method: 'DELETE' });
                if (res.ok) {
                    athleteDashboardOverlay.classList.add('hidden');
                    loadLeaderboard();
                    loadGlobalFeed();
                } else {
                    const err = await res.json();
                    alert(err.error || 'Failed to delete');
                }
            }
        });
    }

    fileImportInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentAthleteId) {
            fileImportInput.value = '';
            return;
        }
        
        const ext = file.name.split('.').pop().toLowerCase();
        const endpoint = `/api/athletes/${currentAthleteId}/upload/${ext}`;
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch(endpoint, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            alert('File uploaded successfully!');
            // Refresh
            const m = document.getElementById('athlete-name').textContent;
            openAthleteDashboard({ id: currentAthleteId, name: m }); 
            loadLeaderboard();
            loadGlobalFeed();
        } catch(err) {
            alert(err.message);
        }
        fileImportInput.value = '';
    });

    // Handle time filters (Visual only for now)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Startup
    loadLeaderboard();
    loadGlobalFeed().then(() => updateTickerTime());
});
