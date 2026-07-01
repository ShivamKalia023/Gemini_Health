document.addEventListener('DOMContentLoaded', () => {
    let performanceChart = null;
    let zonesChart = null;

    const isAdmin = document.cookie.includes('admin_token=true');

    // Init charts safely
    if (typeof initPerformanceChart === 'function') {
        performanceChart = initPerformanceChart('performanceChart');
    }
    if (typeof initZonesChart === 'function') {
        zonesChart = initZonesChart('zonesChart');
    }

    // DOM Elements
    const adminControls = document.getElementById('admin-controls');
    const leaderboardList = document.getElementById('leaderboard-list');
    const globalFeedList = document.getElementById('global-feed-list');
    const challengesList = document.getElementById('challenges-list');
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

    async function loadChallenges() {
        if (!challengesList) return;
        
        try {
            const res = await fetch('/api/dashboard/challenges');
            const data = await res.json();
            
            if (data.length === 0) {
                challengesList.innerHTML = '<div class="loading-text" style="color: #666; font-size: 14px; text-align: center; padding: 20px;">No active challenges found.</div>';
                return;
            }
            
            challengesList.innerHTML = '';
            data.forEach(challenge => {
                const el = document.createElement('div');
                el.className = 'challenge-card';
                el.style.backgroundColor = '#1a1a1a';
                el.style.border = '1px solid #333';
                el.style.borderRadius = '8px';
                el.style.padding = '20px';
                el.style.color = '#fff';
                el.innerHTML = `
                    <h4 style="margin-bottom: 10px; font-size: 16px;">${challenge.title}</h4>
                    <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">${challenge.description}</p>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #888;">
                        <span>Target: ${challenge.targetValue} ${challenge.metric}</span>
                        <span>Ends: ${new Date(challenge.endDate).toLocaleDateString()}</span>
                    </div>
                `;
                challengesList.appendChild(el);
            });
        } catch (err) {
            console.error('Error loading challenges:', err);
            challengesList.innerHTML = '<div class="loading-text" style="color: red; text-align: center;">Failed to load challenges.</div>';
        }
    }

    async function loadLeaderboard() {
        if (!leaderboardList) return;
        
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
                tr.addEventListener('click', () => {
                    window.location.href = 'profile.html?id=' + entry.athlete.id;
                });
                leaderboardList.appendChild(tr);
            });

        } catch (e) {
            console.error(e);
            leaderboardList.innerHTML = '<tr><td colspan="4" class="loading-text">Failed to load.</td></tr>';
        }
    }

    async function loadGlobalFeed() {
        if (!globalFeedList) return;
        
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
        const avatarEl = document.getElementById('athlete-avatar');
        if (avatarEl) avatarEl.src = athlete.avatarUrl || '';
        const nameEl = document.getElementById('athlete-name');
        if (nameEl) nameEl.textContent = athlete.name;
        const cityEl = document.getElementById('athlete-city');
        if (cityEl) cityEl.textContent = athlete.city || '--';

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Fetch Activities & Performance
        const [resAct, resPerf] = await Promise.all([
            fetch(`/api/athletes/${athlete.id}/activities`),
            fetch(`/api/athletes/${athlete.id}/performance`)
        ]);

        const activities = resAct.ok ? await resAct.json() : [];
        const timeline = resPerf.ok ? await resPerf.json() : [];

        // Calculate Stats
        let sumDist = 0;
        let sumTime = 0;
        let sumElev = 0;
        let maxRun = 0;
        
        activities.forEach(a => {
            sumDist += (a.distance || 0);
            sumTime += (a.movingTime || 0);
            sumElev += (a.totalElevationGain || 0);
            if (a.type && a.type.toLowerCase().includes('run')) {
                if ((a.distance || 0) > maxRun) {
                    maxRun = (a.distance || 0);
                }
            }
        });
        
        const durH = Math.floor(sumTime / 3600);
        const durM = Math.floor((sumTime % 3600) / 60);

        if(document.getElementById('stat-activities')) document.getElementById('stat-activities').textContent = activities.length;
        if(document.getElementById('stat-longest-run')) document.getElementById('stat-longest-run').textContent = maxRun.toFixed(1) + ' km';
        if(document.getElementById('stat-elevation')) document.getElementById('stat-elevation').textContent = Math.round(sumElev) + ' m';
        if(document.getElementById('stat-moving-time')) document.getElementById('stat-moving-time').textContent = `${durH}h ${durM}m`;
        
        let avgPaceStr = '0:00/km';
        if (sumDist > 0 && sumTime > 0) {
            const paceSecs = (sumTime / (sumDist)); // seconds per km
            const pM = Math.floor(paceSecs / 60);
            const pS = Math.floor(paceSecs % 60);
            avgPaceStr = `${pM}:${pS.toString().padStart(2, '0')}/km`;
        }
        if(document.getElementById('stat-fastest-pace')) document.getElementById('stat-fastest-pace').textContent = avgPaceStr;
        if(document.getElementById('stat-lifetime')) document.getElementById('stat-lifetime').textContent = sumDist.toFixed(1) + ' km';

        // Feed Rendering
        const feedList = document.getElementById('athlete-feed-list');
        if (feedList) {
            if (activities.length === 0) {
                feedList.innerHTML = '<div style="padding:10px; color:#666;">No recent activities.</div>';
            } else {
                feedList.innerHTML = '';
                // Show top 10 recent
                activities.slice(0, 10).forEach(act => {
                    const actDate = new Date(act.startDate);
                    const diffTime = Math.abs(new Date() - actDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const timeAgo = diffDays > 0 ? `${diffDays}d ago` : 'Today';

                    const dist = act.distance ? act.distance.toFixed(1) + ' km' : '';
                    const durH = Math.floor(act.movingTime / 3600);
                    const durM = Math.floor((act.movingTime % 3600) / 60);
                    const timeStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
                    
                    const el = document.createElement('div');
                    el.className = 'athlete-feed-item';
                    el.innerHTML = `
                        <div style="flex-grow: 1;">
                            <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">${act.name}</div>
                            <div style="font-size: 11px; color: #888;">
                                ${timeStr} · ${dist}
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #666;">${timeAgo}</div>
                    `;
                    feedList.appendChild(el);
                });
            }
        }

        if (performanceChart) {
            updatePerformanceChart(performanceChart, timeline);
        }
    }

    // --- Event Listeners ---

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

    if (fileImportInput) {
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
    }

    // Handle time filters (Visual only for now)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Startup
    const currentPath = window.location.pathname;
    if (currentPath.includes('profile.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const athleteId = urlParams.get('id');
        if (athleteId) {
            fetch(`/api/athletes/${athleteId}`)
                .then(res => res.json())
                .then(athlete => {
                    openAthleteDashboard(athlete);
                })
                .catch(err => console.error(err));
        }
    } else if (currentPath.includes('leaderboard.html')) {
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
    } else if (currentPath.includes('challenges.html')) {
        if (typeof loadChallenges === 'function') loadChallenges();
    } else if (currentPath.includes('dashboard.html')) {
        if (typeof loadGlobalFeed === 'function') {
            loadGlobalFeed().then(() => {
                if (typeof updateTickerTime === 'function') updateTickerTime();
            });
        }
    } else {
        // Default (index.html or /)
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
        if (typeof loadGlobalFeed === 'function') {
            loadGlobalFeed().then(() => {
                if (typeof updateTickerTime === 'function') updateTickerTime();
            });
        }
    }
});
