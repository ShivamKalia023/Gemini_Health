document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const challengeId = urlParams.get('id');
    const container = document.getElementById('challenge-details-container');
    const titleEl = document.getElementById('details-page-title');

    if (!challengeId) {
        titleEl.textContent = "Invalid Challenge";
        container.innerHTML = '<div class="challenge-empty-state"><h4>Challenge Not Found</h4><p>No challenge ID provided.</p><a href="home.html" class="btn btn-primary" style="margin-top:12px;">Return Home</a></div>';
        return;
    }

    const currentAthleteId = window.currentUser ? window.currentUser.id : null;

    try {
        const res = await fetch(`/api/challenges/${challengeId}`);
        if (!res.ok) {
            if (res.status === 404) throw new Error("404_NOT_FOUND");
            if (res.status === 401 || res.status === 403) throw new Error("403_FORBIDDEN");
            throw new Error(`API_ERROR_${res.status}`);
        }
        const challenge = await res.json();
        
        titleEl.textContent = challenge.title;

        // Compute Status
        const now = new Date();
        const start = new Date(challenge.startDate);
        const end = new Date(challenge.endDate);
        
        
        const isCompleted = now > end;
        const isActive = now >= start && now <= end;
        
        let statusColor = '#94a3b8';
        let badgeStatus = 'UPCOMING';
        if (isCompleted) { statusColor = '#64748b'; badgeStatus = 'ENDED'; }
        else if (isActive) { statusColor = '#10b981'; badgeStatus = 'ACTIVE'; }
        else { statusColor = '#f59e0b'; badgeStatus = 'UPCOMING'; }
        
        
        
        const isParticipating = currentAthleteId && challenge.participants && challenge.participants.some(p => p.id === currentAthleteId);
        const participantCount = challenge.participants ? challenge.participants.length : 0;
        
        let btnHtml = '';
        if (isCompleted) {
            btnHtml = `<button class="btn btn-disabled" disabled style="width: 100%; cursor: not-allowed; padding: 12px; border-radius: 8px;">Challenge Ended</button>`;
        } else {
            let buttonText = 'Register';
            let buttonDisabled = false;
            
            if (isParticipating) {
                buttonText = 'Leave Challenge';
                if (isActive) buttonDisabled = true;
            } else {
                if (!regOpen) {
                    buttonText = now < regStart ? 'Registration Not Open' : 'Registration Closed';
                    buttonDisabled = true;
                }
            }
            
            btnHtml = `
                <button id="btn-participate-${challenge.id}" ${buttonDisabled ? 'disabled' : ''} class="btn-participate ${isParticipating && !buttonDisabled ? 'leave' : 'active'}" style="cursor: ${buttonDisabled ? 'not-allowed' : 'pointer'}; width: 100%; padding: 12px; font-weight: 600; border-radius: 8px;">
                    ${buttonText}
                </button>
            `;
        }
        
        const bannerStyle = challenge.bannerImage && challenge.bannerImage.trim() !== '' 
            ? `background-image: url('${challenge.bannerImage}');` 
            : `background: linear-gradient(135deg, #e95420 0%, #ff7e5f 100%);`;

        let topPerformerHtml = `
            <div class="card-hover" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; height: 100%; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: center;">
                    <span style="color: #64748b; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; letter-spacing: 0.5px;">
                        <i data-lucide="trophy" style="width: 14px; height: 14px; color: #fbbf24;"></i> TOP PERFORMER
                    </span>
                </div>
                <div id="top-performer-content" style="padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center;">
                    <div style="color: #64748b; font-size: 12px;">Loading...</div>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <!-- TOP PERFORMER & DETAILS -->
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                    <div class="cc-top-performer" style="flex: 1; min-width: 200px; max-width: 260px;">
                        ${topPerformerHtml}
                    </div>
                    <div class="cc-details card-hover" style="flex: 3; min-width: 320px; display: flex; flex-direction: column; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="${bannerStyle} height: 80px; padding: 12px 16px; display: flex; align-items: flex-end; position: relative; background-size: cover; background-position: center;">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2));"></div>
                            <div style="position: relative; z-index: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="background-color: ${statusColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; display: inline-block;">${badgeStatus}</span>
                                    <h4 style="color: #fff; font-size: 18px; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${challenge.title}</h4>
                                </div>
                                <p style="color: rgba(255,255,255,0.95); font-size: 12px; margin: 0; max-width: 450px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${challenge.description}</p>
                            </div>
                        </div>
                        <div style="padding: 15px; display: flex; flex-wrap: wrap; gap: 15px;">
                            <div style="flex: 1; min-width: 160px;">
                                <h5 style="color: #475569; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Schedule</h5>
                                <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 12px;">
                                    
                                    <span style="color: #64748b;">Starts:</span> <span style="color: #1e293b; font-weight: 500;">${formatDateTimeCompact(challenge.startDate)}</span>
                                    <span style="color: #64748b;">Ends:</span> <span style="color: #1e293b; font-weight: 500;">${formatDateTimeCompact(challenge.endDate)}</span>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 160px; display: flex; flex-direction: column; justify-content: space-between; border-left: 1px solid #e2e8f0; padding-left: 15px;">
                                <div>
                                    <h5 style="color: #475569; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Status</h5>
                                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 12px;">
                                        
                                        <span style="color: #64748b;">Participants:</span> <span style="color: #1e293b; font-weight: 600;" id="participant-count-${challenge.id}">${participantCount}</span>
                                        <span style="color: #64748b;">Your Status:</span> <span style="color: ${isParticipating ? '#10b981' : '#64748b'}; font-weight: 500;">${isParticipating ? 'Registered' : 'Not Registered'}</span>
                                    </div>
                                </div>
                                <div style="margin-top: 10px;">
                                    ${btnHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- QUICK STATS (FULL WIDTH) -->
                <div class="card-hover" style="display: flex; gap: 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow-x: auto;">
                    <div style="flex: 1; text-align: center; border-right: 1px solid #e2e8f0; padding-right: 10px;">
                        <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Target Goal</div>
                        <div style="color: #1e293b; font-size: 14px; font-weight: 700;">${challenge.targetValue} ${challenge.unit}</div>
                    </div>
                    <div style="flex: 1; text-align: center; border-right: 1px solid #e2e8f0; padding: 0 10px;">
                        <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Category</div>
                        <div style="color: #1e293b; font-size: 14px; font-weight: 700;">${challenge.activityType || 'Any'}</div>
                    </div>
                    <div style="flex: 1; text-align: center; border-right: 1px solid #e2e8f0; padding: 0 10px;">
                        <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Goal Type</div>
                        <div style="color: #1e293b; font-size: 14px; font-weight: 700; text-transform: capitalize;">${challenge.goalType || 'N/A'}</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding-left: 10px;">
                        <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Progress</div>
                        <div style="color: #10b981; font-size: 14px; font-weight: 700;">Active</div>
                    </div>
                </div>
            </div>
        `;

        const pBtn = document.getElementById(`btn-participate-${challenge.id}`);
        if (pBtn && !pBtn.disabled) {
            pBtn.addEventListener('click', async () => {
                if (!currentAthleteId) {
                    alert('Please log in to participate in challenges');
                    window.location.href = 'welcome.html';
                    return;
                }
                
                try {
                    const btnState = pBtn.classList.contains('leave') ? 'leave' : 'join';
                    const method = btnState === 'leave' ? 'DELETE' : 'POST';
                    
                    pBtn.disabled = true;
                    pBtn.textContent = 'Processing...';
                    
                    const pRes = await fetch(`/api/challenges/${challenge.id}/participants/${currentAthleteId}`, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken()
                        }
                    });
                    
                    if (pRes.ok) {
                        window.location.reload(); // Reload to reflect changes
                    } else {
                        const errText = await pRes.text();
                        alert(`Failed to ${btnState} challenge: ${errText}`);
                        window.location.reload();
                    }
                } catch(e) {
                    console.error(e);
                    alert("An error occurred.");
                    window.location.reload();
                }
            });
        }

        if (window.lucide) lucide.createIcons();

        // Fetch and render leaderboard
        await fetchLeaderboard(challenge.id, challenge, currentAthleteId);

    } catch (err) {
        console.error("Error loading challenge:", err);
        titleEl.textContent = "Error";
        
        if (err.message === "404_NOT_FOUND") {
            container.innerHTML = '<div class="challenge-empty-state"><h4>Challenge Not Found</h4><p>The challenge you are looking for does not exist.</p><a href="home.html" class="btn btn-primary" style="margin-top:12px;">Return Home</a></div>';
        } else if (err.message === "403_FORBIDDEN") {
            container.innerHTML = '<div class="challenge-empty-state"><h4>Access Denied</h4><p>You do not have permission to view this challenge.</p><a href="home.html" class="btn btn-primary" style="margin-top:12px;">Return Home</a></div>';
        } else {
            container.innerHTML = '<div class="challenge-empty-state"><h4>Something went wrong</h4><p>Could not load challenge details due to an unexpected error. Please try again later.</p><a href="home.html" class="btn btn-primary" style="margin-top:12px;">Return Home</a></div>';
        }
    }
});

async function fetchLeaderboard(challengeId, challenge, currentAthleteId) {
    const lbSection = document.getElementById('challenge-leaderboard-section');
    const lbList = document.getElementById('leaderboard-list');
    const lbSubtitle = document.getElementById('leaderboard-subtitle');
    
    lbSection.style.display = 'block';
    if (challenge.activityType) {
        lbSubtitle.textContent = `LIVE RANKINGS · ${challenge.activityType.toUpperCase()}`;
    }

    try {
        const res = await fetch(`/api/challenges/${challengeId}/leaderboard`);
        if (!res.ok) throw new Error("Leaderboard fetch failed");
        
        const entries = await res.json();
        lbList.innerHTML = '';
        
        if (entries.length === 0) {
            lbList.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">No participants yet. Be the first to join!</td></tr>';
            
            const tpContent = document.getElementById('top-performer-content');
            if (tpContent) {
                tpContent.innerHTML = '<div style="color: #64748b; font-size: 12px; margin: auto;">No participants yet.</div>';
            }
            return;
        }
        
        // Update top performer
        const topEntry = entries[0];
        const tpContent = document.getElementById('top-performer-content');
        if (tpContent && topEntry) {
            const tpProgressPct = Math.min(100, Math.round((topEntry.progress / challenge.targetValue) * 100));
            tpContent.innerHTML = `
                <div style="width: 50px; height: 50px; border-radius: 50%; background: #e2e8f0; margin-bottom: 8px; overflow: hidden; border: 2px solid #fbbf24; flex-shrink: 0; box-shadow: 0 2px 4px rgba(251,191,36,0.3);">
                    <img src="${topEntry.athlete.profileMedium || ''}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${topEntry.athlete.firstname}+${topEntry.athlete.lastname}&background=e2e8f0&color=64748b'">
                </div>
                <h4 style="margin: 0 0 2px 0; color: #1e293b; font-size: 14px; font-weight: 700;">${topEntry.athlete.firstname} ${topEntry.athlete.lastname}</h4>
                <div style="font-size: 11px; color: #fbbf24; font-weight: 800; margin-bottom: 12px; letter-spacing: 0.5px;">RANK #1</div>
                
                <div style="width: 100%; background: #f8fafc; border-radius: 6px; padding: 10px; border: 1px solid #e2e8f0; margin-top: auto;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span style="color: #64748b; font-weight: 500;">Progress</span>
                        <span style="color: #1e293b; font-weight: 700;">${topEntry.progress.toFixed(1)} ${challenge.unit}</span>
                    </div>
                    <div style="width: 100%; height: 5px; background: #e2e8f0; border-radius: 2px; overflow: hidden; margin-bottom: 8px;">
                        <div style="height: 100%; width: ${tpProgressPct}%; background: ${tpProgressPct >= 100 ? '#10b981' : '#fbbf24'}; border-radius: 2px;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px;">
                        <span style="color: #64748b; font-weight: 500;">Activities</span>
                        <span style="color: #1e293b; font-weight: 700;">${topEntry.activityCount != null ? topEntry.activityCount : '?'}</span>
                    </div>
                </div>
            `;
        }
        
        entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.className = 'leaderboard-row';
            tr.style.borderBottom = '1px solid #e2e8f0';
            
            let rankHtml = `<span style="color: #64748b; font-weight: 600;">${entry.rank}</span>`;
            if (entry.rank === 1) rankHtml = `<span style="color: #fbbf24; font-weight: 700; display: flex; align-items: center; gap: 5px;"><i data-lucide="trophy" style="width:14px; height:14px;"></i> 1</span>`;
            else if (entry.rank === 2) rankHtml = `<span style="color: #64748b; font-weight: 700;">2</span>`;
            else if (entry.rank === 3) rankHtml = `<span style="color: #b45309; font-weight: 700;">3</span>`;
            
            const isMe = currentAthleteId && entry.athlete.id === currentAthleteId;
            const athleteName = isMe ? `${entry.athlete.firstname} ${entry.athlete.lastname} (You)` : `${entry.athlete.firstname} ${entry.athlete.lastname}`;
            const athleteStyle = isMe ? 'color: #e95420; font-weight: 600;' : 'color: #1e293b; font-weight: 500;';
            
            const progressPct = Math.min(100, Math.round((entry.progress / challenge.targetValue) * 100));
            
            tr.innerHTML = `
                <td style="padding: 10px 16px;">${rankHtml}</td>
                <td style="padding: 10px 16px; ${athleteStyle}">
                    <a href="profile.html?id=${entry.athlete.id}" style="color: inherit; text-decoration: none;">${athleteName}</a>
                </td>
                <td style="padding: 10px 16px; color: #1e293b;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-weight: 600; font-size: 12px;">${entry.progress.toFixed(1)} <span style="font-size: 10px; color: #64748b;">${challenge.unit}</span></span>
                        <div style="width: 100%; max-width: 120px; height: 5px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                            <div style="height: 100%; width: ${progressPct}%; background: ${progressPct >= 100 ? '#10b981' : '#e95420'}; border-radius: 2px;"></div>
                        </div>
                    </div>
                </td>
                <td style="padding: 10px 16px; color: #1e293b; font-weight: 600; font-size: 12px;">
                    ${entry.activityCount != null ? entry.activityCount : '-'}
                </td>
                <td style="padding: 10px 16px;">
                    ${entry.isCompleted ? 
                        '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">COMPLETED</span>' : 
                        `<span style="color: #64748b; font-size: 10px;">${progressPct}%</span>`
                    }
                </td>
            `;
            lbList.appendChild(tr);
        });

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("Error loading challenge leaderboard:", err);
        lbList.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #ef4444;">Unable to load leaderboard. Please try again.</td></tr>';
    }
}

function formatDateTimeCompact(dateString) {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '--';
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
}

function formatDateTime(dateString) {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '--';
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day} ${month} ${year}   ${hoursStr}:${minutes} ${ampm}`;
}

function getCsrfToken() {
    const meta = document.querySelector('meta[name="_csrf"]');
    return meta ? meta.getAttribute('content') : '';
}
