// Core Application Logic for Gemini Health Dashboard

document.addEventListener('DOMContentLoaded', () => {
    let athletes = [];
    let selectedAthlete = null;
    let athleteActivities = [];

    let performanceChart = null;
    let zonesChart = null;

    // DOM refs
    const profilesList = document.getElementById('profiles-list');
    const emptyState = document.getElementById('empty-state');
    const dashboardContent = document.getElementById('dashboard-content');
    const athleteAvatar = document.getElementById('athlete-avatar');
    const athleteName = document.getElementById('athlete-name');
    const athleteCity = document.getElementById('athlete-city');
    const athleteState = document.getElementById('athlete-state');
    const athleteCountry = document.getElementById('athlete-country');
    const athleteSport = document.getElementById('athlete-sport');
    const athleteGoal = document.getElementById('athlete-goal');
    const athleteFtp = document.getElementById('athlete-ftp');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    const statWeeklyDist = document.getElementById('stat-weekly-dist');
    const statGoalProgress = document.getElementById('stat-goal-progress');
    const statGoalText = document.getElementById('stat-goal-text');
    const statFitness = document.getElementById('stat-fitness');
    const statFatigue = document.getElementById('stat-fatigue');
    const statForm = document.getElementById('stat-form');
    const statFormStatus = document.getElementById('stat-form-status');

    // Last run card refs
    const lastRunName = document.getElementById('last-run-name');
    const lastRunDate = document.getElementById('last-run-date');
    const lastRunDistance = document.getElementById('last-run-distance');
    const lastRunDuration = document.getElementById('last-run-duration');
    const lastRunPace = document.getElementById('last-run-pace');
    const lastRunAvgDuration = document.getElementById('last-run-avg-duration');

    // Import banner refs
    const importBanner = document.getElementById('import-success-banner');
    const importBannerText = document.getElementById('import-banner-text');
    const closeBannerBtn = document.getElementById('close-banner-btn');

    const stravaConnectBtn = document.getElementById('strava-connect-btn');
    const fileImportInput = document.getElementById('file-import-input');

    const activitySearch = document.getElementById('activity-search');
    const activityTypeFilter = document.getElementById('activity-type-filter');
    const activitiesTableBody = document.getElementById('activities-table-body');

    // Init charts
    performanceChart = initPerformanceChart('performanceChart');
    zonesChart = initZonesChart('zonesChart');

    // ---- API Functions ----

    async function fetchAthletes(autoSelectId) {
        try {
            const res = await fetch('/api/athletes');
            if (!res.ok) throw new Error('Failed to fetch athletes');
            athletes = await res.json();
            renderProfilesList();

            if (athletes.length === 0) {
                showEmptyState(true);
            } else {
                showEmptyState(false);
                let toSelect = athletes[0];
                if (autoSelectId) {
                    const m = athletes.find(a => a.id == autoSelectId);
                    if (m) toSelect = m;
                } else if (selectedAthlete) {
                    const m = athletes.find(a => a.id == selectedAthlete.id);
                    if (m) toSelect = m;
                }
                selectAthlete(toSelect.id);
            }
        } catch (e) {
            console.error('Error fetching athletes', e);
            profilesList.innerHTML = '<div class="loading-text">Failed to load profiles.</div>';
        }
    }

    function renderProfilesList() {
        if (athletes.length === 0) {
            profilesList.innerHTML = '<div class="loading-text">No profiles yet.</div>';
            return;
        }
        profilesList.innerHTML = '';
        athletes.forEach(a => {
            const item = document.createElement('div');
            item.className = `profile-item ${selectedAthlete && selectedAthlete.id === a.id ? 'active' : ''}`;
            item.innerHTML = `
                <img src="${a.avatarUrl || ''}" alt="" class="profile-item-avatar">
                <div class="profile-item-info">
                    <span class="profile-item-name">${a.name}</span>
                    <span class="profile-item-sport">${a.primarySport}</span>
                </div>`;
            item.addEventListener('click', () => selectAthlete(a.id));
            profilesList.appendChild(item);
        });
    }

    async function selectAthlete(id) {
        selectedAthlete = athletes.find(a => a.id == id);
        renderProfilesList();
        if (!selectedAthlete) return;

        // Update header
        athleteAvatar.src = selectedAthlete.avatarUrl || '';
        athleteName.textContent = selectedAthlete.name;
        athleteCity.textContent = selectedAthlete.city || '--';
        athleteState.textContent = selectedAthlete.state || '';
        athleteCountry.textContent = selectedAthlete.country || '';
        athleteSport.textContent = selectedAthlete.primarySport;
        athleteGoal.textContent = `Goal: ${selectedAthlete.weeklyDistanceGoal || 0} km/wk`;
        if (selectedAthlete.ftp) {
            athleteFtp.textContent = `FTP: ${selectedAthlete.ftp} W`;
            athleteFtp.classList.remove('hidden');
        } else {
            athleteFtp.classList.add('hidden');
        }

        // Hide banner on profile switch
        importBanner.classList.add('hidden');

        await fetchActivities(id);
        await fetchPerformanceTimeline(id);
        await fetchZones(id);
    }

    async function fetchActivities(id) {
        try {
            const res = await fetch(`/api/athletes/${id}/activities`);
            if (!res.ok) throw new Error('err');
            athleteActivities = await res.json();
            calculateWeeklyMileage();
            calculateLastRun();
            filterAndRenderActivities();
        } catch (e) {
            console.error('Error fetching activities', e);
            activitiesTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#6b7280;">Failed to load.</td></tr>';
        }
    }

    function calculateWeeklyMileage() {
        const today = new Date();
        const dow = today.getDay();
        const distToMon = dow === 0 ? 6 : dow - 1;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - distToMon);
        startOfWeek.setHours(0, 0, 0, 0);

        let sum = 0;
        athleteActivities.forEach(a => {
            const d = new Date(a.startDate);
            if (d >= startOfWeek && d <= today) sum += (a.distance || 0);
        });

        statWeeklyDist.textContent = sum.toFixed(1);
        const goal = selectedAthlete.weeklyDistanceGoal || 50;
        const pct = goal > 0 ? Math.min((sum / goal) * 100, 100) : 0;
        statGoalProgress.style.width = `${pct}%`;
        statGoalText.textContent = `${Math.round(pct)}% of ${goal} km goal`;
    }

    function calculateLastRun() {
        // Find the most recent running activity
        const runs = athleteActivities.filter(a => {
            const t = (a.type || '').toLowerCase();
            return t.includes('run') || t.includes('hike') || t.includes('walk');
        });

        if (runs.length === 0) {
            lastRunName.textContent = 'No running activities found';
            lastRunDate.textContent = '';
            lastRunDistance.innerHTML = '-- <span class="unit">km</span>';
            lastRunDuration.textContent = '--';
            lastRunPace.innerHTML = '-- <span class="unit">/ km</span>';
            lastRunAvgDuration.textContent = '--';
            return;
        }

        // runs are already sorted desc by startDate from the API
        const last = runs[0];

        // Name & Date
        lastRunName.textContent = last.name;
        const d = new Date(last.startDate);
        lastRunDate.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

        // Distance
        const dist = last.distance || 0;
        lastRunDistance.innerHTML = `${dist.toFixed(1)} <span class="unit">km</span>`;

        // Duration
        lastRunDuration.textContent = formatDuration(last.movingTime || 0);

        // Avg Pace (min/km)
        if (dist > 0 && last.movingTime > 0) {
            const totalMinutes = last.movingTime / 60;
            const paceMinPerKm = totalMinutes / dist;
            const paceMin = Math.floor(paceMinPerKm);
            const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
            lastRunPace.innerHTML = `${paceMin}:${paceSec.toString().padStart(2, '0')} <span class="unit">/ km</span>`;
        } else {
            lastRunPace.innerHTML = '-- <span class="unit">/ km</span>';
        }

        // Average duration across ALL runs
        let totalDuration = 0;
        runs.forEach(r => totalDuration += (r.movingTime || 0));
        const avgDuration = Math.round(totalDuration / runs.length);
        lastRunAvgDuration.textContent = formatDuration(avgDuration);
    }

    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    }

    function filterAndRenderActivities() {
        const query = activitySearch.value.trim().toLowerCase();
        const sportFilter = activityTypeFilter.value;

        const filtered = athleteActivities.filter(act => {
            const matchQ = act.name.toLowerCase().includes(query) || (act.type || '').toLowerCase().includes(query);
            let matchS = true;
            if (sportFilter !== 'all') {
                const t = (act.type || '').toLowerCase();
                if (sportFilter === 'run') matchS = t.includes('run') || t.includes('hike') || t.includes('walk');
                else if (sportFilter === 'ride') matchS = t.includes('ride') || t.includes('cycl') || t.includes('bike');
                else if (sportFilter === 'swim') matchS = t.includes('swim');
                else if (sportFilter === 'gym') matchS = t.includes('gym') || t.includes('weight') || t.includes('strength');
            }
            return matchQ && matchS;
        });

        if (filtered.length === 0) {
            activitiesTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#6b7280;">No activities match filter.</td></tr>';
            return;
        }

        activitiesTableBody.innerHTML = '';
        filtered.forEach(act => {
            const tr = document.createElement('tr');
            const date = new Date(act.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const dist = act.distance ? `${act.distance.toFixed(1)} km` : '--';
            const dur = formatDuration(act.movingTime || 0);
            const elev = act.totalElevationGain ? `${Math.round(act.totalElevationGain)} m` : '--';
            const hr = act.averageHr ? `${act.averageHr} bpm` : '--';
            const trimp = act.trimp || '--';

            tr.innerHTML = `
                <td>${date}</td>
                <td style="font-weight:600;">${act.name}</td>
                <td><span class="badge">${act.type || 'Workout'}</span></td>
                <td>${dist}</td>
                <td>${dur}</td>
                <td>${elev}</td>
                <td>${hr}</td>
                <td style="font-weight:700;color:#2563eb;">${trimp}</td>`;
            activitiesTableBody.appendChild(tr);
        });
    }

    async function fetchPerformanceTimeline(id) {
        try {
            const res = await fetch(`/api/athletes/${id}/performance`);
            if (!res.ok) throw new Error('err');
            const timeline = await res.json();

            if (timeline.length > 0) {
                const latest = timeline[timeline.length - 1];
                statFitness.textContent = Math.round(latest.fitness);
                statFatigue.textContent = Math.round(latest.fatigue);
                statForm.textContent = Math.round(latest.form);
                statFormStatus.textContent = latest.status;

                statForm.style.color = latest.status === 'Optimal' ? '#16a34a' :
                    latest.status === 'Overreaching' ? '#dc2626' :
                    latest.status === 'Warning' ? '#ca8a04' : '#2563eb';
            } else {
                statFitness.textContent = '0';
                statFatigue.textContent = '0';
                statForm.textContent = '0';
                statFormStatus.textContent = '--';
            }
            updatePerformanceChart(performanceChart, timeline);
        } catch (e) {
            console.error('Error fetching timeline', e);
        }
    }

    async function fetchZones(id) {
        try {
            const res = await fetch(`/api/athletes/${id}/zones`);
            if (!res.ok) throw new Error('err');
            const zones = await res.json();
            updateZonesChart(zonesChart, zones);
        } catch (e) {
            console.error('Error fetching zones', e);
        }
    }

    // ---- Import Handlers ----

    // Strava logic is handled via redirect now


    async function uploadFile(file) {
        const name = prompt('Enter athlete name to associate this upload (will create new if not exists):');
        if (!name || !name.trim()) {
            alert('Athlete name is required to upload this file.');
            fileImportInput.value = '';
            return;
        }
        
        const trimmedName = name.trim();
        let targetAthlete = athletes.find(a => a.name.toLowerCase() === trimmedName.toLowerCase());
        
        if (!targetAthlete) {
            try {
                const res = await fetch('/api/athletes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: trimmedName })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to create athlete');
                }
                targetAthlete = await res.json();
                // Refresh athlete list
                await fetchAthletes(targetAthlete.id);
            } catch (e) {
                alert('Failed to create or select athlete: ' + e.message);
                fileImportInput.value = '';
                return;
            }
        } else {
            // Athlete exists, select them
            await selectAthlete(targetAthlete.id);
        }

        const ext = file.name.split('.').pop().toLowerCase();
        let endpoint = '';
        if (ext === 'csv') {
            endpoint = `/api/athletes/${targetAthlete.id}/upload/csv`;
        } else if (ext === 'gpx') {
            endpoint = `/api/athletes/${targetAthlete.id}/upload/gpx`;
        } else {
            alert('Unsupported file. Please upload a .csv or .gpx file.');
            fileImportInput.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            showImportBanner(`Uploading ${file.name}...`);
            const res = await fetch(endpoint, { method: 'POST', body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || err.details || 'Server error');
            }
            const result = await res.json();

            // Build details string from parsed result
            let details = `File "${file.name}" imported successfully.`;
            if (ext === 'gpx' && result.name) {
                const dist = result.distance ? result.distance.toFixed(1) + ' km' : '--';
                const dur = result.movingTime ? formatDuration(result.movingTime) : '--';
                const hr = result.averageHr ? result.averageHr + ' bpm avg HR' : '';
                details = `GPX imported: "${result.name}" — ${dist}, ${dur}${hr ? ', ' + hr : ''}`;
            } else if (ext === 'csv') {
                details = `CSV imported successfully for ${targetAthlete.name}. Refreshing dashboard...`;
            }

            showImportBanner(details);
            await selectAthlete(targetAthlete.id);
            fileImportInput.value = '';

            // Show success for a bit longer
            setTimeout(() => {
                showImportBanner(details + ' ✓');
            }, 1000);
        } catch (e) {
            console.error('File upload error:', e);
            showImportBanner(`Upload failed: ${e.message}`, true);
            fileImportInput.value = '';
            setTimeout(() => {
                importBanner.classList.add('hidden');
            }, 5000);
        }
    }

    async function deleteAthlete() {
        if (!selectedAthlete) return;
        if (!confirm(`Delete "${selectedAthlete.name}" and all their activities?`)) return;
        try {
            const res = await fetch(`/api/athletes/${selectedAthlete.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            selectedAthlete = null;
            await fetchAthletes();
        } catch (e) {
            alert(`Delete failed: ${e.message}`);
        }
    }

    // ---- UI Helpers ----

    function showEmptyState(show) {
        emptyState.classList.toggle('hidden', !show);
        dashboardContent.classList.toggle('hidden', show);
    }

    function showImportBanner(text, isError = false) {
        importBannerText.textContent = text;
        importBanner.classList.remove('hidden');
        if (isError) {
            importBanner.style.borderColor = '#dc2626';
            importBanner.style.backgroundColor = '#fee2e2';
        } else {
            importBanner.style.borderColor = '#10b981';
            importBanner.style.backgroundColor = '#ecfdf5';
        }
    }

    // ---- Event Listeners ----

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
            if (btn.dataset.tab === 'overview') {
                performanceChart.resize();
                zonesChart.resize();
            }
        });
    });

    if (stravaConnectBtn) {
        stravaConnectBtn.addEventListener('click', () => {
            window.location.href = '/api/athletes/strava/login';
        });
    }

    fileImportInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
    });

    activitySearch.addEventListener('input', filterAndRenderActivities);
    activityTypeFilter.addEventListener('change', filterAndRenderActivities);
    deleteProfileBtn.addEventListener('click', deleteAthlete);
    closeBannerBtn.addEventListener('click', () => importBanner.classList.add('hidden'));

    // Check for success param in URL after Strava redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('strava_success') === 'true') {
        const name = urlParams.get('name') || 'Athlete';
        showImportBanner(`Strava profile "${name}" connected successfully!`);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('strava_error')) {
        showImportBanner(`Strava connection failed: ${urlParams.get('strava_error')}`, true);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ---- Startup ----
    fetchAthletes();
});
