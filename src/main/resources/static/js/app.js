document.addEventListener('DOMContentLoaded', () => {
    let performanceChart = null;
    let zonesChart = null;

    const isAdmin = document.cookie.includes('admin_token=true');

    // Init charts
    performanceChart = initPerformanceChart('performanceChart');
    zonesChart = initZonesChart('zonesChart');

    // DOM Elements
    const adminControls = document.getElementById('admin-controls');
    const addChallengeBtn = document.getElementById('add-challenge-btn');
    const addChallengeForm = document.getElementById('add-challenge-form');
    const saveChallengeBtn = document.getElementById('save-challenge-btn');
    const cancelChallengeBtn = document.getElementById('cancel-challenge-btn');
    const challengesList = document.getElementById('challenges-list');
    
    const leaderboardList = document.getElementById('leaderboard-list');
    const globalFeedList = document.getElementById('global-feed-list');
    const profilesList = document.getElementById('profiles-list');
    
    const athleteDashboardOverlay = document.getElementById('athlete-dashboard-overlay');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    
    const stravaConnectBtn = document.getElementById('strava-connect-btn');
    const fileImportInput = document.getElementById('file-import-input');

    let currentAthleteId = null;

    // Admin UI Setup
    if (isAdmin) {
        adminControls.classList.remove('hidden');
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    // --- API Calls & Rendering ---

    async function loadLeaderboard() {
        try {
            const res = await fetch('/api/dashboard/leaderboard');
            const data = await res.json();
            
            if (data.length === 0) {
                leaderboardList.innerHTML = '<div class="loading-text">No athletes found.</div>';
                return;
            }
            
            leaderboardList.innerHTML = '';
            data.forEach((entry, idx) => {
                const dist = entry.lastRunDistance ? entry.lastRunDistance.toFixed(1) : '0.0';
                const el = document.createElement('div');
                el.className = 'leaderboard-item';
                el.innerHTML = `
                    <div class="rank">#${idx + 1}</div>
                    <img src="${entry.athlete.avatarUrl || ''}" alt="">
                    <div class="leaderboard-item-info">
                        <h4>${entry.athlete.name}</h4>
                        <span>${entry.athlete.primarySport}</span>
                    </div>
                    <div class="score">${dist} <span class="unit" style="font-size:10px;color:gray">km</span></div>
                `;
                leaderboardList.appendChild(el);
            });
        } catch (e) {
            console.error(e);
            leaderboardList.innerHTML = '<div class="loading-text">Failed to load.</div>';
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
                const date = new Date(act.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const icon = act.type.toLowerCase().includes('run') ? '🏃' : (act.type.toLowerCase().includes('ride') ? '🚴' : '💪');
                const dist = act.distance ? act.distance.toFixed(1) + ' km' : '';
                const time = formatDuration(act.movingTime || 0);
                
                const el = document.createElement('div');
                el.className = 'feed-item';
                el.innerHTML = `
                    <div class="feed-item-icon">${icon}</div>
                    <div class="feed-item-content">
                        <div class="feed-header">
                            <span class="feed-athlete">${act.athlete ? act.athlete.name : 'Unknown'}</span>
                            <span class="feed-time">${date}</span>
                        </div>
                        <div class="feed-title">${act.name}</div>
                        <div class="feed-stats">
                            ${dist ? `<span><strong>${dist}</strong> Distance</span>` : ''}
                            <span><strong>${time}</strong> Time</span>
                            ${act.trimp ? `<span><strong>${act.trimp}</strong> TRIMP</span>` : ''}
                        </div>
                    </div>
                `;
                globalFeedList.appendChild(el);
            });
        } catch(e) {
            console.error(e);
            globalFeedList.innerHTML = '<div class="loading-text">Failed to load.</div>';
        }
    }

    async function loadChallenges() {
        try {
            const res = await fetch('/api/dashboard/challenges');
            const data = await res.json();
            
            if (data.length === 0) {
                challengesList.innerHTML = '<div class="loading-text">No upcoming challenges.</div>';
                return;
            }
            
            challengesList.innerHTML = '';
            data.forEach(c => {
                const el = document.createElement('div');
                el.className = 'challenge-card';
                let delBtn = isAdmin ? `<button class="challenge-del-btn" data-id="${c.id}">Delete</button>` : '';
                
                el.innerHTML = `
                    <div>
                        <h4>${c.title}</h4>
                        <p>${c.description || ''}</p>
                    </div>
                    ${delBtn}
                `;
                challengesList.appendChild(el);
            });
            
            if (isAdmin) {
                document.querySelectorAll('.challenge-del-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.dataset.id;
                        if(confirm('Delete challenge?')) {
                            await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
                            loadChallenges();
                        }
                    });
                });
            }
        } catch(e) {
            console.error(e);
            challengesList.innerHTML = '<div class="loading-text">Failed to load.</div>';
        }
    }

    async function loadAthletes() {
        try {
            const res = await fetch('/api/athletes');
            const data = await res.json();
            
            if (data.length === 0) {
                profilesList.innerHTML = '<div class="loading-text">No athletes yet.</div>';
                return;
            }
            
            profilesList.innerHTML = '';
            data.forEach(a => {
                const item = document.createElement('div');
                item.className = 'profile-item';
                item.innerHTML = `
                    <img src="${a.avatarUrl || ''}" alt="" class="profile-item-avatar">
                    <div class="profile-item-info">
                        <span class="profile-item-name">${a.name}</span>
                        <span class="profile-item-sport">${a.primarySport}</span>
                    </div>`;
                item.addEventListener('click', () => openAthleteDashboard(a));
                profilesList.appendChild(item);
            });
        } catch(e) {
            console.error(e);
            profilesList.innerHTML = '<div class="loading-text">Failed to load.</div>';
        }
    }

    // --- Athlete Dashboard ---

    async function openAthleteDashboard(athlete) {
        currentAthleteId = athlete.id;
        document.getElementById('athlete-avatar').src = athlete.avatarUrl || '';
        document.getElementById('athlete-name').textContent = athlete.name;
        document.getElementById('athlete-city').textContent = athlete.city || '--';
        document.getElementById('athlete-state').textContent = athlete.state || '';
        document.getElementById('athlete-country').textContent = athlete.country || '';

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
                    loadAthletes();
                    loadLeaderboard();
                    loadGlobalFeed();
                } else {
                    const err = await res.json();
                    alert(err.error || 'Failed to delete');
                }
            }
        });
    }

    if (addChallengeBtn) {
        addChallengeBtn.addEventListener('click', () => addChallengeForm.classList.remove('hidden'));
        cancelChallengeBtn.addEventListener('click', () => addChallengeForm.classList.add('hidden'));
        saveChallengeBtn.addEventListener('click', async () => {
            const title = document.getElementById('challenge-title').value;
            const desc = document.getElementById('challenge-desc').value;
            if (!title) return alert('Title required');
            
            const res = await fetch('/api/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: desc })
            });
            if (res.ok) {
                addChallengeForm.classList.add('hidden');
                document.getElementById('challenge-title').value = '';
                document.getElementById('challenge-desc').value = '';
                loadChallenges();
            } else {
                alert('Failed to add challenge');
            }
        });
    }

    fileImportInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentAthleteId) {
            alert("Please open an athlete's dashboard first to upload a file.");
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

    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    }

    // Startup
    loadLeaderboard();
    loadChallenges();
    loadGlobalFeed();
    loadAthletes();
});
