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
    let currentChartRange = '7d';
    let currentCustomStart = '';
    let currentCustomEnd = '';

    if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    function updateTickerTime() {
        if (!lastUpdatedTicker) return;
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastUpdatedTicker.innerHTML = `Last Updated: ${timeString}`;
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.color = '#94a3b8';
                    b.style.borderBottom = 'none';
                });
                e.target.classList.add('active');
                e.target.style.color = '#e95420';
                e.target.style.borderBottom = '2px solid #e95420';
                loadChallenges(e.target.getAttribute('data-tab'));
            });
        });
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return '--';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '--';
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const hoursStr = String(hours).padStart(2, '0');
        
        return `${day} ${month} ${year} • ${hoursStr}:${minutes} ${ampm}`;
    };

    async function loadChallenges(type = 'upcoming') {
        if (!challengesList) return;
        
        challengesList.innerHTML = '<div class="loading-text">Loading challenges...</div>';
        
        const athleteIdCookie = document.cookie.split('; ').find(row => row.startsWith('athlete_id='));
        const currentAthleteId = athleteIdCookie ? parseInt(athleteIdCookie.split('=')[1]) : null;

        try {
            const res = await fetch(`/api/challenges/${type}`);
            const visibleChallenges = await res.json();
            
            if (visibleChallenges.length === 0) {
                challengesList.innerHTML = `<div class="loading-text" style="color: #666; font-size: 14px; text-align: center; padding: 20px;">No ${type} challenges found.</div>`;
                return;
            }
            
            challengesList.innerHTML = '';
            visibleChallenges.forEach(challenge => {
                const isParticipating = currentAthleteId && challenge.participants && challenge.participants.some(p => p.id === currentAthleteId);
                const participantCount = challenge.participants ? challenge.participants.length : 0;
                
                let badgeStatus = challenge.status || (type === 'active' ? 'Active' : 'Upcoming');
                let statusColor = type === 'active' ? '#10b981' : '#3b82f6';
                let btnHtml = '';

                let regStateText = '';
                let regStatusDotColor = '#cbd5e1';
                let buttonDisabled = false;
                let buttonText = isParticipating ? 'Leave Challenge' : 'Participate';
                let showButton = type === 'upcoming'; 

                const now = new Date();
                const rStart = challenge.registrationStartDate ? new Date(challenge.registrationStartDate) : null;
                const rEnd = challenge.registrationEndDate ? new Date(challenge.registrationEndDate) : null;
                
                if (type === 'upcoming') {
                    if (rStart && rEnd) {
                        if (now < rStart) {
                            regStateText = 'Registration Not Open Yet';
                            regStatusDotColor = '#fbbf24';
                            buttonDisabled = true;
                        } else if (now >= rStart && now < rEnd) {
                            regStateText = 'Registration Open';
                            regStatusDotColor = '#10b981';
                        } else {
                            regStateText = 'Registration Closed';
                            regStatusDotColor = '#ef4444';
                            buttonDisabled = true;
                        }
                    } else {
                        regStateText = 'Upcoming';
                        regStatusDotColor = '#3b82f6';
                    }
                } else if (type === 'active') {
                    regStateText = 'Challenge Active';
                    regStatusDotColor = '#10b981';
                }

                if (showButton) {
                    btnHtml = `
                        <button id="btn-participate-${challenge.id}" ${buttonDisabled ? 'disabled' : ''} class="btn-participate ${isParticipating && !buttonDisabled ? 'leave' : 'active'}" style="cursor: ${buttonDisabled ? 'not-allowed' : 'pointer'};">
                            ${buttonText}
                        </button>
                    `;
                }
                
                const el = document.createElement('div');
                el.className = 'modern-challenge-card';
                if (type === 'active') {
                    el.style.cursor = 'pointer';
                    el.addEventListener('click', (e) => {
                        if(e.target.tagName !== 'BUTTON') {
                            openChallengeLeaderboard(challenge, currentAthleteId);
                        }
                    });
                }
                
                const bannerStyle = challenge.bannerImage && challenge.bannerImage.trim() !== '' 
                    ? `background-image: url('${challenge.bannerImage}');` 
                    : `background: linear-gradient(135deg, #e95420 0%, #ff7e5f 100%);`;

                el.innerHTML = `
                    <div class="cc-left" style="${bannerStyle}">
                        <div class="cc-left-content">
                            <span class="cc-status-badge" style="background-color: ${statusColor}40; color: #fff; border: 1px solid ${statusColor};">${badgeStatus}</span>
                            <h4 class="cc-title">${challenge.title}</h4>
                            <p class="cc-desc">${challenge.description}</p>
                        </div>
                    </div>
                    
                    <div class="cc-middle">
                        <div class="cc-timeline">
                            <div class="cc-timeline-item">
                                <div class="cc-icon">📅</div>
                                <div class="cc-info">
                                    <span class="cc-label">Registration Opens</span>
                                    <span class="cc-value">${formatDateTime(challenge.registrationStartDate)}</span>
                                </div>
                            </div>
                            <div class="cc-timeline-item">
                                <div class="cc-icon">🔒</div>
                                <div class="cc-info">
                                    <span class="cc-label">Registration Closes</span>
                                    <span class="cc-value">${formatDateTime(challenge.registrationEndDate)}</span>
                                </div>
                            </div>
                            <div class="cc-timeline-item">
                                <div class="cc-icon">🚩</div>
                                <div class="cc-info">
                                    <span class="cc-label">Challenge Starts</span>
                                    <span class="cc-value">${formatDateTime(challenge.startDate)}</span>
                                </div>
                            </div>
                            <div class="cc-timeline-item">
                                <div class="cc-icon">🏁</div>
                                <div class="cc-info">
                                    <span class="cc-label">Challenge Ends</span>
                                    <span class="cc-value">${formatDateTime(challenge.endDate)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cc-stats-row">
                            <div class="cc-stat">
                                <span class="cc-label">🎯 Goal</span>
                                <span class="cc-value">${challenge.targetValue} ${challenge.unit}</span>
                            </div>
                            <div class="cc-stat">
                                <span class="cc-label">👥 Participants</span>
                                <span class="cc-value" id="participant-count-${challenge.id}">${participantCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="cc-right">
                        ${btnHtml}
                        <div class="cc-reg-status">
                            <div class="cc-dot" style="background-color: ${regStatusDotColor};"></div>
                            <span style="color: ${regStatusDotColor};">${regStateText}</span>
                        </div>
                        ${type === 'active' ? '<div style="margin-top: 10px; color: #94a3b8; font-size: 12px; font-weight: 600;">View Leaderboard &rarr;</div>' : ''}
                    </div>
                `;
                challengesList.appendChild(el);

                if (showButton && !buttonDisabled) {
                    const btn = document.getElementById(`btn-participate-${challenge.id}`);
                    if (btn) {
                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (!currentAthleteId) {
                                alert("Please log in to participate in challenges.");
                                return;
                            }
                            const isCurrentlyParticipating = btn.textContent.trim() === 'Leave Challenge';
                            const method = isCurrentlyParticipating ? 'DELETE' : 'POST';
                            
                            try {
                                btn.disabled = true;
                                btn.textContent = 'Processing...';
                                const pRes = await fetch(`/api/challenges/${challenge.id}/participate`, { method });
                                const pData = await pRes.json();
                                
                                if (pRes.ok) {
                                    document.getElementById(`participant-count-${challenge.id}`).textContent = pData.participantCount;
                                    if (isCurrentlyParticipating) {
                                        btn.textContent = 'Participate';
                                        btn.className = 'btn-participate active';
                                    } else {
                                        btn.textContent = 'Leave Challenge';
                                        btn.className = 'btn-participate leave';
                                    }
                                } else {
                                    alert(pData.error || 'Action failed.');
                                    btn.textContent = isCurrentlyParticipating ? 'Leave Challenge' : 'Participate';
                                }
                            } catch (err) {
                                console.error(err);
                                alert('An error occurred.');
                                btn.textContent = isCurrentlyParticipating ? 'Leave Challenge' : 'Participate';
                            } finally {
                                btn.disabled = false;
                            }
                        });
                    }
                }
            });
        } catch (err) {
            console.error('Error loading challenges:', err);
            challengesList.innerHTML = '<div class="loading-text" style="color: red; text-align: center;">Failed to load challenges.</div>';
        }
    }

    async function openChallengeLeaderboard(challenge, currentAthleteId) {
        const overlay = document.getElementById('challenge-modal-overlay');
        const closeBtn = document.getElementById('close-challenge-modal');
        if(!overlay) return;
        
        document.getElementById('modal-challenge-title').textContent = challenge.title;
        document.getElementById('modal-challenge-desc').textContent = challenge.description;
        document.getElementById('modal-challenge-goal').textContent = `${challenge.targetValue} ${challenge.unit}`;
        
        const start = formatDateTime(challenge.startDate);
        const end = formatDateTime(challenge.endDate);
        document.getElementById('modal-challenge-duration').textContent = `${start.split('•')[0].trim()} - ${end.split('•')[0].trim()}`;
        
        document.getElementById('modal-challenge-participants').textContent = challenge.participants ? challenge.participants.length : 0;
        
        const listContainer = document.getElementById('modal-leaderboard-list');
        listContainer.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">Loading leaderboard...</td></tr>';
        
        overlay.classList.remove('hidden');
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        
        closeBtn.onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => overlay.classList.add('hidden'), 300);
        };
        
        try {
            const res = await fetch(`/api/challenges/${challenge.id}/leaderboard`);
            const data = await res.json();
            
            listContainer.innerHTML = '';
            if (data.length === 0) {
                listContainer.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No participants found.</td></tr>';
                return;
            }
            
            data.forEach(entry => {
                const isCurrentUser = currentAthleteId && entry.athlete.id === currentAthleteId;
                const tr = document.createElement('tr');
                if (isCurrentUser) {
                    tr.style.background = 'rgba(233, 84, 32, 0.1)';
                    tr.style.borderLeft = '4px solid #e95420';
                } else {
                    tr.style.borderBottom = '1px solid #334155';
                }
                
                const progressText = entry.progress % 1 === 0 ? entry.progress : entry.progress.toFixed(2);
                
                tr.innerHTML = `
                    <td style="padding: 16px; color: #f8fafc; font-weight: 600;">#${entry.rank}</td>
                    <td style="padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${entry.athlete.avatarUrl || ''}" alt="" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                            <span style="color: #f8fafc;">${entry.athlete.name} ${isCurrentUser ? '(You)' : ''}</span>
                        </div>
                    </td>
                    <td style="padding: 16px; color: #f8fafc;">${progressText} / ${challenge.targetValue} ${challenge.unit} <span style="color: #94a3b8; font-size: 12px;">(${entry.percentage.toFixed(1)}%)</span></td>
                    <td style="padding: 16px;">
                        <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${entry.isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)'}; color: ${entry.isCompleted ? '#10b981' : '#94a3b8'};">
                            ${entry.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                    </td>
                `;
                listContainer.appendChild(tr);
            });
            
        } catch(e) {
            console.error(e);
            listContainer.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #ef4444;">Failed to load leaderboard.</td></tr>';
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
            window.allGlobalActivities = await res.json();
            if (typeof renderGlobalFeed === 'function') {
                renderGlobalFeed();
            }
        } catch(e) {
            console.error(e);
            globalFeedList.innerHTML = '<div class="loading-text">Failed to load.</div>';
        }
    }

    async function updateChartForRange(athleteId, rangeType, customStart, customEnd) {
        let start = '';
        let end = '';
        
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];

        if (rangeType === '7d') {
            const d = new Date();
            d.setDate(today.getDate() - 6);
            start = d.toISOString().split('T')[0];
            end = endStr;
        } else if (rangeType === '1m') {
            const d = new Date();
            d.setDate(today.getDate() - 29);
            start = d.toISOString().split('T')[0];
            end = endStr;
        } else if (rangeType === '3m') {
            const d = new Date();
            d.setDate(today.getDate() - 89);
            start = d.toISOString().split('T')[0];
            end = endStr;
        } else if (rangeType === 'custom') {
            start = customStart;
            end = customEnd || endStr;
        }

        try {
            const res = await fetch(`/api/athletes/${athleteId}/performance?startDate=${start}&endDate=${end}`);
            if (!res.ok) throw new Error('Failed to fetch performance timeline');
            const timelineData = await res.json();
            
            const hasActivity = timelineData.some(pt => pt.activityCount > 0);
            const emptyState = document.getElementById('chart-empty-state');
            const canvasContainer = document.getElementById('chart-canvas-container');

            if (!hasActivity) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (canvasContainer) canvasContainer.classList.add('hidden');
            } else {
                if (emptyState) emptyState.classList.add('hidden');
                if (canvasContainer) canvasContainer.classList.remove('hidden');
            }

            if (performanceChart) {
                updatePerformanceChart(performanceChart, timelineData);
            }
        } catch (err) {
            console.error(err);
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

        // Fetch Activities
        const resAct = await fetch(`/api/athletes/${athlete.id}/activities`);
        const activities = resAct.ok ? await resAct.json() : [];

        // Calculate Stats
        let sumDist = 0;
        let sumTime = 0;
        let sumElev = 0;
        
        let maxRun = 0;
        let maxRide = 0;
        let minPace = Infinity; // seconds per km
        let maxSpeed = 0; // km/h
        
        activities.forEach(a => {
            sumDist += (a.distance || 0);
            sumTime += (a.movingTime || 0);
            sumElev += (a.totalElevationGain || 0);
            
            const isRun = a.type && a.type.toLowerCase().includes('run');
            const isRide = a.type && (a.type.toLowerCase().includes('ride') || a.type.toLowerCase().includes('cycle'));
            
            if (isRun) {
                if ((a.distance || 0) > maxRun) {
                    maxRun = a.distance;
                }
                if (a.movingTime && a.distance > 0) {
                    const pace = a.movingTime / a.distance; // secs per km
                    if (pace < minPace) {
                        minPace = pace;
                    }
                }
            } else if (isRide) {
                if ((a.distance || 0) > maxRide) {
                    maxRide = a.distance;
                }
                if (a.averageSpeed && a.averageSpeed > maxSpeed) {
                    maxSpeed = a.averageSpeed;
                }
            }
        });
        
        const durH = Math.floor(sumTime / 3600);
        const durM = Math.floor((sumTime % 3600) / 60);

        if(document.getElementById('stat-activities')) document.getElementById('stat-activities').textContent = activities.length;
        if(document.getElementById('stat-elevation')) document.getElementById('stat-elevation').textContent = Math.round(sumElev) + ' m';
        if(document.getElementById('stat-moving-time')) document.getElementById('stat-moving-time').textContent = `${durH}h ${durM}m`;
        if(document.getElementById('stat-lifetime')) document.getElementById('stat-lifetime').textContent = sumDist.toFixed(1) + ' km';

        // Check if cycling-focused athlete
        const primarySport = athlete.primarySport ? athlete.primarySport.toLowerCase() : 'run';
        const isCycling = primarySport.includes('ride') || primarySport.includes('cycle');

        // Dynamically locate stat header labels & icons
        const longestCardHeader = document.querySelector('.profile-stat-card:nth-of-type(1) .stat-header span:first-child');
        const longestCardIcon = document.querySelector('.profile-stat-card:nth-of-type(1) .stat-header .stat-icon');
        const longestCardValue = document.getElementById('stat-longest-run');

        const bestCardHeader = document.querySelector('.profile-stat-card:nth-of-type(2) .stat-header span:first-child');
        const bestCardIcon = document.querySelector('.profile-stat-card:nth-of-type(2) .stat-header .stat-icon');
        const bestCardValue = document.getElementById('stat-fastest-pace');

        if (isCycling) {
            if (longestCardHeader) longestCardHeader.textContent = 'LONGEST RIDE';
            if (longestCardIcon) longestCardIcon.textContent = '🚴';
            if (longestCardValue) longestCardValue.textContent = maxRide.toFixed(1) + ' km';

            if (bestCardHeader) bestCardHeader.textContent = 'MAX SPEED';
            if (bestCardIcon) bestCardIcon.textContent = '⚡';
            if (bestCardValue) bestCardValue.textContent = (maxSpeed > 0 ? maxSpeed.toFixed(1) : '0.0') + ' km/h';
        } else {
            if (longestCardHeader) longestCardHeader.textContent = 'LONGEST RUN';
            if (longestCardIcon) longestCardIcon.textContent = '🏃';
            if (longestCardValue) longestCardValue.textContent = maxRun.toFixed(1) + ' km';

            if (bestCardHeader) bestCardHeader.textContent = 'FASTEST PACE';
            if (bestCardIcon) bestCardIcon.textContent = '⏱️';
            
            let paceStr = '0:00/km';
            if (minPace !== Infinity) {
                const pM = Math.floor(minPace / 60);
                const pS = Math.floor(minPace % 60);
                paceStr = `${pM}:${pS.toString().padStart(2, '0')}/km`;
            }
            if (bestCardValue) bestCardValue.textContent = paceStr;
        }

        // Feed Rendering
        const feedList = document.getElementById('athlete-feed-list');
        if (feedList) {
            window.allProfileActivities = activities;
            if (typeof renderProfileFeed === 'function') {
                renderProfileFeed();
            }
        }

        // Setup filter click listeners
        const filterBtns = document.querySelectorAll('.chart-filter-btn');
        const customDateInputs = document.getElementById('custom-date-inputs');

        // Apply active class to the button matching currentChartRange
        filterBtns.forEach(btn => {
            const range = btn.getAttribute('data-range');
            if (range === currentChartRange) {
                btn.classList.add('active');
                btn.style.background = 'rgba(233, 84, 32, 0.1)';
                btn.style.color = '#e95420';
                btn.style.borderColor = 'rgba(233, 84, 32, 0.2)';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'rgba(255,255,255,0.02)';
                btn.style.color = '#94a3b8';
                btn.style.borderColor = 'rgba(255,255,255,0.05)';
            }

            // Remove previous event listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        if (currentChartRange === 'custom') {
            if (customDateInputs) customDateInputs.classList.remove('hidden');
            if (document.getElementById('custom-start-date')) document.getElementById('custom-start-date').value = currentCustomStart;
            if (document.getElementById('custom-end-date')) document.getElementById('custom-end-date').value = currentCustomEnd;
        } else {
            if (customDateInputs) customDateInputs.classList.add('hidden');
        }

        // Re-bind click events
        const newFilterBtns = document.querySelectorAll('.chart-filter-btn');
        newFilterBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                newFilterBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'rgba(255,255,255,0.02)';
                    b.style.color = '#94a3b8';
                    b.style.borderColor = 'rgba(255,255,255,0.05)';
                });
                
                btn.classList.add('active');
                btn.style.background = 'rgba(233, 84, 32, 0.1)';
                btn.style.color = '#e95420';
                btn.style.borderColor = 'rgba(233, 84, 32, 0.2)';

                const range = btn.getAttribute('data-range');
                currentChartRange = range;

                if (range === 'custom') {
                    if (customDateInputs) customDateInputs.classList.remove('hidden');
                } else {
                    if (customDateInputs) customDateInputs.classList.add('hidden');
                    currentCustomStart = '';
                    currentCustomEnd = '';
                    await updateChartForRange(athlete.id, range);
                }
            });
        });

        // Set up Custom Date Picker triggers
        const applyCustomBtn = document.getElementById('apply-custom-date');
        if (applyCustomBtn) {
            const newApplyBtn = applyCustomBtn.cloneNode(true);
            applyCustomBtn.parentNode.replaceChild(newApplyBtn, applyCustomBtn);
            
            newApplyBtn.addEventListener('click', async () => {
                const startDateVal = document.getElementById('custom-start-date').value;
                const endDateVal = document.getElementById('custom-end-date').value;
                if (!startDateVal) {
                    alert('Please select a start date');
                    return;
                }
                currentCustomStart = startDateVal;
                currentCustomEnd = endDateVal;
                await updateChartForRange(athlete.id, 'custom', startDateVal, endDateVal);
            });
        }

        await updateChartForRange(athlete.id, currentChartRange, currentCustomStart, currentCustomEnd);
    }

    // --- Event Listeners ---

    // Initialize user profile menu if logged in
    async function initUserMenu() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const athleteIdCookie = document.cookie.split('; ').find(row => row.startsWith('athlete_id='));
        const athleteId = athleteIdCookie ? athleteIdCookie.split('=')[1] : null;

        if (!athleteId) {
            // Unauthenticated: Inject Connect with Strava Button
            navActions.innerHTML = '';
            const connectBtn = document.createElement('button');
            connectBtn.id = 'strava-connect-btn';
            connectBtn.className = 'strava-connect-btn';
            connectBtn.textContent = 'Connect with Strava';
            connectBtn.addEventListener('click', () => {
                window.location.href = '/api/auth/strava';
            });
            navActions.appendChild(connectBtn);

            // Unauthenticated connect button listener (only applies on welcome page)
            const welcomeBtn = document.querySelector('.strava-auth-btn');
            if (welcomeBtn) {
                welcomeBtn.addEventListener('click', () => {
                    window.location.href = '/api/auth/strava';
                });
            }
            return;
        }

        try {
            // Fetch athlete details
            const response = await fetch(`/api/athletes/${athleteId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch athlete');
            }
            const athlete = await response.json();

            navActions.innerHTML = ''; // Clear container before adding avatar

            // Create the user profile menu structure
            const menuContainer = document.createElement('div');
            menuContainer.className = 'user-profile-menu';
            menuContainer.style.position = 'relative';
            menuContainer.style.display = 'inline-block';

            // Avatar
            const avatarBtn = document.createElement('button');
            avatarBtn.className = 'avatar-btn';
            avatarBtn.style.width = '40px';
            avatarBtn.style.height = '40px';
            avatarBtn.style.borderRadius = '50%';
            avatarBtn.style.border = '2px solid rgba(233, 84, 32, 0.6)';
            avatarBtn.style.background = '#1e293b';
            avatarBtn.style.cursor = 'pointer';
            avatarBtn.style.overflow = 'hidden';
            avatarBtn.style.display = 'flex';
            avatarBtn.style.alignItems = 'center';
            avatarBtn.style.justifyContent = 'center';
            avatarBtn.style.padding = '0';
            avatarBtn.style.transition = 'all 0.2s';
            avatarBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

            avatarBtn.addEventListener('mouseenter', () => {
                avatarBtn.style.transform = 'scale(1.05)';
                avatarBtn.style.borderColor = '#f97316';
            });
            avatarBtn.addEventListener('mouseleave', () => {
                avatarBtn.style.transform = 'scale(1)';
                avatarBtn.style.borderColor = 'rgba(233, 84, 32, 0.6)';
            });

            if (athlete.avatarUrl && athlete.avatarUrl !== 'avatar.png' && !athlete.avatarUrl.includes('placeholder')) {
                const img = document.createElement('img');
                img.src = athlete.avatarUrl;
                img.alt = athlete.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                avatarBtn.appendChild(img);
            } else {
                const names = athlete.name ? athlete.name.split(' ') : ['A'];
                const initials = names.map(n => n[0]).slice(0, 2).join('').toUpperCase();
                const textSpan = document.createElement('span');
                textSpan.textContent = initials;
                textSpan.style.color = '#f8fafc';
                textSpan.style.fontWeight = 'bold';
                textSpan.style.fontSize = '14px';
                avatarBtn.appendChild(textSpan);
            }

            // Dropdown Menu
            const dropdown = document.createElement('div');
            dropdown.className = 'profile-dropdown';
            dropdown.style.position = 'absolute';
            dropdown.style.top = 'calc(100% + 10px)';
            dropdown.style.right = '0';
            dropdown.style.background = 'var(--bg-card, #ffffff)';
            dropdown.style.border = '1px solid var(--border-color, #e5e7eb)';
            dropdown.style.borderRadius = '12px';
            dropdown.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            dropdown.style.width = '200px';
            dropdown.style.zIndex = '1000';
            dropdown.style.overflow = 'hidden';
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            dropdown.style.pointerEvents = 'none';
            dropdown.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

            const createDropdownLink = (text, icon, onClick) => {
                const link = document.createElement('button');
                link.style.width = '100%';
                link.style.padding = '12px 16px';
                link.style.background = 'transparent';
                link.style.border = 'none';
                link.style.color = 'var(--text-primary, #1a1a1a)';
                link.style.fontSize = '14px';
                link.style.fontWeight = '600';
                link.style.textAlign = 'left';
                link.style.cursor = 'pointer';
                link.style.display = 'flex';
                link.style.alignItems = 'center';
                link.style.gap = '10px';
                link.style.transition = 'all 0.2s';
                link.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
                link.addEventListener('mouseenter', () => {
                    link.style.background = 'rgba(233, 84, 32, 0.08)';
                    link.style.color = 'var(--color-orange, #e95420)';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.background = 'transparent';
                    link.style.color = 'var(--text-primary, #1a1a1a)';
                });
                link.addEventListener('click', onClick);
                return link;
            };

            const profileBtn = createDropdownLink('My Profile', '👤', () => {
                window.location.href = `profile.html?id=${athleteId}`;
            });

            const adminBtn = createDropdownLink('Admin Panel', '🛡️', () => {
                window.location.href = 'admin.html';
            });

            const logoutBtn = createDropdownLink('Log Out', '🚪', () => {
                document.cookie = "athlete_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "welcome.html";
            });

            const deleteBtn = createDropdownLink('Delete My Account', '⚠️', () => {
                showDeleteConfirmationModal(athleteId, athlete.name);
            });
            deleteBtn.style.color = 'var(--color-red, #dc2626)';
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.background = 'rgba(220, 38, 38, 0.08)';
                deleteBtn.style.color = '#b91c1c';
            });
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.background = 'transparent';
                deleteBtn.style.color = 'var(--color-red, #dc2626)';
            });

            if (athlete.role === 'ADMIN') {
                dropdown.appendChild(adminBtn);
            }
            dropdown.appendChild(profileBtn);
            dropdown.appendChild(logoutBtn);
            
            const divider = document.createElement('div');
            divider.style.height = '1px';
            divider.style.background = 'var(--border-color, #e5e7eb)';
            dropdown.appendChild(divider);
            dropdown.appendChild(deleteBtn);

            menuContainer.appendChild(avatarBtn);
            menuContainer.appendChild(dropdown);
            navActions.appendChild(menuContainer);

            // Toggle dropdown open/close
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.style.opacity === '1';
                if (isOpen) {
                    dropdown.style.opacity = '0';
                    dropdown.style.transform = 'translateY(-10px)';
                    dropdown.style.pointerEvents = 'none';
                } else {
                    dropdown.style.opacity = '1';
                    dropdown.style.transform = 'translateY(0)';
                    dropdown.style.pointerEvents = 'auto';
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                dropdown.style.pointerEvents = 'none';
            });

        } catch (err) {
            console.error('Error loading user menu:', err);
        }
    }

    function showDeleteConfirmationModal(athleteId, name) {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.background = 'rgba(15, 23, 42, 0.8)';
        backdrop.style.backdropFilter = 'blur(8px)';
        backdrop.style.zIndex = '9999';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'opacity 0.25s ease-out';

        const card = document.createElement('div');
        card.style.background = '#1e293b';
        card.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        card.style.borderRadius = '16px';
        card.style.padding = '32px';
        card.style.width = '90%';
        card.style.maxWidth = '460px';
        card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        card.style.transform = 'scale(0.9)';
        card.style.transition = 'transform 0.25s ease-out';
        card.style.fontFamily = "'Outfit', 'Inter', sans-serif";

        card.innerHTML = `
            <h2 style="color: #ef4444; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 12px; font-family: 'Outfit', sans-serif; text-transform: uppercase;">Delete Account?</h2>
            <p style="color: #f8fafc; font-size: 15px; font-weight: 600; margin-bottom: 20px; line-height: 1.5;">This action is permanent and cannot be undone.</p>
            <div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; padding: 16px; margin-bottom: 28px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <p style="color: #94a3b8; font-size: 13px; font-weight: 600; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">Deleting your account will permanently remove:</p>
                <ul style="color: #e2e8f0; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Athlete profile</li>
                    <li>Imported activities</li>
                    <li>GPX/CSV uploads</li>
                    <li>Training metrics</li>
                    <li>Statistics</li>
                    <li>Leaderboard records</li>
                    <li>All associated data</li>
                </ul>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancel-delete-btn" style="background: rgba(255,255,255,0.05); color: #f8fafc; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;">Cancel</button>
                <button id="confirm-delete-btn" style="background: #dc2626; color: #ffffff; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">Delete Permanently</button>
            </div>
        `;

        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        setTimeout(() => {
            backdrop.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 10);

        const closeModal = () => {
            backdrop.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
                document.body.removeChild(backdrop);
            }, 250);
        };

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        const cancelBtn = card.querySelector('#cancel-delete-btn');
        cancelBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.1)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.05)';
        });

        const confirmBtn = card.querySelector('#confirm-delete-btn');
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
            try {
                const response = await fetch(`/api/athletes/${athleteId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete account');
                }

                document.cookie = "athlete_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

                window.location.href = '/welcome.html?deleted=true';
            } catch (err) {
                console.error('Delete failed:', err);
                alert(`Error: ${err.message}`);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete Permanently';
            }
        });
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.background = '#b91c1c';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.background = '#dc2626';
        });
    }

    initUserMenu();

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
        if (typeof loadGlobalFeed === 'function') loadGlobalFeed();
    } else {
        // Default (index.html or /)
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
        if (typeof loadGlobalFeed === 'function') loadGlobalFeed();
    }
    
    // Update ticker unconditionally since it's now in the global navbar
    if (typeof updateTickerTime === 'function') updateTickerTime();
});

window.globalFilterType = 'all';
window.globalFilterSort = 'newest';

window.profileFilterType = 'all';
window.profileFilterSort = 'newest';

function applyFeedFiltersAndSort(activities, type, sort) {
    let filtered = activities || [];

    // Make a copy if type is all, so we don't mutate original array with sort
    if (type === 'all') {
        filtered = [...filtered];
    } else {
        filtered = filtered.filter(act => {
            const actType = (act.type || '').toLowerCase();
            
            // Comprehensive normalization mapping for Strava activity types
            const runTypes = ['run', 'trailrun', 'running'];
            const rideTypes = ['ride', 'mountainbikeride', 'gravelride', 'ebikeride', 'emountainbikeride', 'handcycle', 'velomobile', 'cycling', 'biking'];
            const walkTypes = ['walk', 'walking'];
            const hikeTypes = ['hike', 'hiking'];
            const swimTypes = ['swim', 'swimming'];
            const workoutTypes = ['workout', 'weighttraining', 'crossfit', 'highintensityintervaltraining', 'pilates', 'yoga', 'stairstepper', 'elliptical', 'gym'];
            const rowTypes = ['rowing', 'row', 'virtualrow'];
            const vRunTypes = ['virtualrun'];
            const vRideTypes = ['virtualride'];
            
            if (type === 'run') return runTypes.includes(actType);
            if (type === 'ride') return rideTypes.includes(actType);
            if (type === 'walk') return walkTypes.includes(actType);
            if (type === 'hike') return hikeTypes.includes(actType);
            if (type === 'swim') return swimTypes.includes(actType);
            if (type === 'workout') return workoutTypes.includes(actType);
            if (type === 'row') return rowTypes.includes(actType);
            if (type === 'virtual run') return vRunTypes.includes(actType);
            if (type === 'virtual ride') return vRideTypes.includes(actType);
            
            if (type === 'other') {
                const allMapped = [
                    ...runTypes, ...rideTypes, ...walkTypes, ...hikeTypes,
                    ...swimTypes, ...workoutTypes, ...rowTypes, ...vRunTypes, ...vRideTypes
                ];
                return !allMapped.includes(actType);
            }
            
            return actType === type;
        });
    }

    filtered.sort((a, b) => {
        if (sort === 'newest') return new Date(b.startDate) - new Date(a.startDate);
        if (sort === 'oldest') return new Date(a.startDate) - new Date(b.startDate);
        if (sort === 'longest-dist') return (b.distance || 0) - (a.distance || 0);
        if (sort === 'shortest-dist') return (a.distance || 0) - (b.distance || 0);
        if (sort === 'longest-dur') return (b.movingTime || 0) - (a.movingTime || 0);
        if (sort === 'shortest-dur') return (a.movingTime || 0) - (b.movingTime || 0);
        return 0;
    });

    return filtered;
}

window.renderGlobalFeed = function() {
    const globalFeedList = document.getElementById('global-feed-list');
    if (!globalFeedList) return;

    const filtered = applyFeedFiltersAndSort(window.allGlobalActivities, window.globalFilterType, window.globalFilterSort);
    
    const displayEl = document.getElementById('dashboard-active-filters') || document.getElementById('home-active-filters');
    if (displayEl) {
        if (window.globalFilterType !== 'all' || window.globalFilterSort !== 'newest') {
            const typeLabel = document.querySelector('.feed-select[id$="-type"] option[value="' + window.globalFilterType + '"]')?.textContent || window.globalFilterType;
            const sortLabel = document.querySelector('.feed-select[id$="-sort"] option[value="' + window.globalFilterSort + '"]')?.textContent || window.globalFilterSort;
            
            displayEl.innerHTML = `<div>Activity Type: <span>${typeLabel}</span> | Sort: <span>${sortLabel}</span></div>`;
            displayEl.classList.remove('hidden');
        } else {
            displayEl.classList.add('hidden');
        }
    }

    if (!filtered || filtered.length === 0) {
        globalFeedList.innerHTML = '<div style="padding:15px; color:#666; text-align:center; background:rgba(255,255,255,0.02); border-radius:8px;">No activities found for the selected filters.</div>';
        return;
    }

    globalFeedList.innerHTML = '';
    filtered.forEach(act => {
        const actDate = new Date(act.startDate);
        const diffTime = Math.abs(new Date() - actDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const timeAgo = diffDays > 0 ? diffDays + 'd ago' : 'Today';

        const dist = act.distance ? act.distance.toFixed(1) + ' km' : '';
        const durH = Math.floor(act.movingTime / 3600);
        const durM = Math.floor((act.movingTime % 3600) / 60);
        const timeStr = durH > 0 ? durH + 'h ' + durM + 'm' : durM + 'm';
        
        const avatar = act.athlete && act.athlete.avatarUrl ? `<img src="${act.athlete.avatarUrl}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">` : `<div style="width:32px;height:32px;background:#ddd;border-radius:4px;"></div>`;
        
        const el = document.createElement('div');
        el.className = 'feed-item';
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            window.location.href = 'activity.html?id=' + act.id;
        });
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
                ${(act.type.toLowerCase().includes('run') ? '🏃' : (act.type.toLowerCase().includes('ride') ? '🚴' : '💪'))}
            </div>
        `;
        globalFeedList.appendChild(el);
    });
};

window.renderProfileFeed = function() {
    const feedList = document.getElementById('athlete-feed-list');
    if (!feedList) return;

    const filtered = applyFeedFiltersAndSort(window.allProfileActivities, window.profileFilterType, window.profileFilterSort);

    const displayEl = document.getElementById('profile-active-filters');
    if (displayEl) {
        if (window.profileFilterType !== 'all' || window.profileFilterSort !== 'newest') {
            const typeLabel = document.querySelector('#profile-feed-type option[value="' + window.profileFilterType + '"]')?.textContent || window.profileFilterType;
            const sortLabel = document.querySelector('#profile-feed-sort option[value="' + window.profileFilterSort + '"]')?.textContent || window.profileFilterSort;
            
            displayEl.innerHTML = `<div>Activity Type: <span>${typeLabel}</span> | Sort: <span>${sortLabel}</span></div>`;
            displayEl.classList.remove('hidden');
        } else {
            displayEl.classList.add('hidden');
        }
    }

    if (!filtered || filtered.length === 0) {
        feedList.innerHTML = '<div style="padding:15px; color:#666; text-align:center; background:rgba(255,255,255,0.02); border-radius:8px;">No activities found for the selected filters.</div>';
        return;
    }

    feedList.innerHTML = '';
    filtered.slice(0, 50).forEach(act => {
        const actDate = new Date(act.startDate);
        const diffTime = Math.abs(new Date() - actDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const timeAgo = diffDays > 0 ? diffDays + 'd ago' : 'Today';

        const dist = act.distance ? act.distance.toFixed(1) + ' km' : '';
        const durH = Math.floor(act.movingTime / 3600);
        const durM = Math.floor((act.movingTime % 3600) / 60);
        const timeStr = durH > 0 ? durH + 'h ' + durM + 'm' : durM + 'm';
        
        const el = document.createElement('div');
        el.className = 'athlete-feed-item';
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
            window.location.href = 'activity.html?id=' + act.id;
        });
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
};



// Global initialization function to ensure we attach after elements are ready
function initFilters() {
    if (window.filtersInitialized) return;
    window.filtersInitialized = true;

    // Global Feed Listeners
    const dbType = document.getElementById('dashboard-feed-type') || document.getElementById('home-feed-type');
    const dbSort = document.getElementById('dashboard-feed-sort') || document.getElementById('home-feed-sort');
    const dbApply = document.getElementById('dashboard-feed-apply') || document.getElementById('home-feed-apply');
    const dbReset = document.getElementById('dashboard-feed-reset') || document.getElementById('home-feed-reset');

    if (dbApply) {
        dbApply.addEventListener('click', () => {
            if (dbType) window.globalFilterType = dbType.value;
            if (dbSort) window.globalFilterSort = dbSort.value;
            window.renderGlobalFeed();
        });
    }
    
    if (dbReset) {
        dbReset.addEventListener('click', () => {
            window.globalFilterType = 'all';
            window.globalFilterSort = 'newest';
            if(dbType) dbType.value = 'all';
            if(dbSort) dbSort.value = 'newest';
            window.renderGlobalFeed();
        });
    }

    // Profile Feed Listeners
    const pfType = document.getElementById('profile-feed-type');
    const pfSort = document.getElementById('profile-feed-sort');
    const pfApply = document.getElementById('profile-feed-apply');
    const pfReset = document.getElementById('profile-feed-reset');

    if (pfApply) {
        pfApply.addEventListener('click', () => {
            if (pfType) window.profileFilterType = pfType.value;
            if (pfSort) window.profileFilterSort = pfSort.value;
            window.renderProfileFeed();
        });
    }

    if (pfReset) {
        pfReset.addEventListener('click', () => {
            window.profileFilterType = 'all';
            window.profileFilterSort = 'newest';
            if(pfType) pfType.value = 'all';
            if(pfSort) pfSort.value = 'newest';
            window.renderProfileFeed();
        });
    }
}

// Attempt to initialize immediately (in case DOM is already ready)
initFilters();
// Also wait for DOMContentLoaded to guarantee execution
document.addEventListener('DOMContentLoaded', initFilters);
