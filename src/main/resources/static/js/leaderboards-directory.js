document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('challenge-directory-container');
    if (!container) return;

    async function fetchChallenges() {
        try {
            // Fetch both active and upcoming challenges
            const [activeRes, upcomingRes] = await Promise.all([
                fetch('/api/challenges/active'),
                fetch('/api/challenges/upcoming')
            ]);

            let activeChallenges = [];
            let upcomingChallenges = [];

            // Check if active API returned valid JSON
            if (activeRes.ok) {
                const contentType = activeRes.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    activeChallenges = await activeRes.json();
                } else {
                    throw new Error(`Active challenges API returned invalid content type: ${contentType}`);
                }
            } else {
                throw new Error(`Active challenges API failed: ${activeRes.status} ${activeRes.statusText}`);
            }

            // Check if upcoming API returned valid JSON
            if (upcomingRes.ok) {
                const contentType = upcomingRes.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    upcomingChallenges = await upcomingRes.json();
                } else {
                    throw new Error(`Upcoming challenges API returned invalid content type: ${contentType}`);
                }
            } else {
                throw new Error(`Upcoming challenges API failed: ${upcomingRes.status} ${upcomingRes.statusText}`);
            }

            console.log("Challenges fetched successfully.");
            console.log("Active challenges:", activeChallenges.length);
            console.log("Upcoming challenges:", upcomingChallenges.length);

            renderChallenges(activeChallenges, upcomingChallenges);
        } catch (error) {
            console.error("Failed to load challenges for directory:", error);
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444; background: #fee2e2; border-radius: 12px;">
                    <h4 style="margin-bottom: 8px;">Unable to load challenge leaderboards.</h4>
                    <p style="font-size: 0.9rem; margin-bottom: 16px;">Error: ${error.message}</p>
                    <button onclick="window.location.reload()" style="padding: 8px 16px; background: #e95420; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Retry</button>
                </div>
            `;
            // Safe execution in case lucide is undefined
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    function renderChallenges(activeChallenges, upcomingChallenges) {
        container.innerHTML = '';

        const allChallenges = [
            ...activeChallenges.map(c => ({ ...c, uiStatus: 'active' })),
            ...upcomingChallenges.map(c => ({ ...c, uiStatus: 'upcoming' }))
        ];

        // Sort by start date (closest first)
        allChallenges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (allChallenges.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <h4 style="color: #334155; margin-bottom: 8px;">No challenge leaderboards available yet.</h4>
                    <p style="color: #64748b; font-size: 0.95rem;">Check back later when new challenges are created.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        allChallenges.forEach(challenge => {
            const card = document.createElement('div');
            card.className = 'dir-challenge-card';
            
            card.addEventListener('click', () => {
                window.location.href = `challenge-details.html?id=${challenge.id}`;
            });

            let badgeClass = '';
            let badgeText = '';

            if (challenge.uiStatus === 'active') {
                badgeClass = 'badge-active';
                badgeText = 'Active';
            } else if (challenge.uiStatus === 'upcoming') {
                badgeClass = 'badge-upcoming';
                badgeText = 'Upcoming';
            } else {
                badgeClass = 'badge-completed';
                badgeText = 'Completed';
            }

            const participantCount = challenge.participants ? challenge.participants.length : 0;
            const goalText = `${challenge.targetValue} ${challenge.unit}`;
            
            // Map activity type to emoji safely
            let emoji = '🏃';
            const cat = challenge.activityType ? challenge.activityType.toUpperCase() : 'RUN';
            if (cat.includes('RIDE') || cat.includes('CYCL')) emoji = '🚴';
            else if (cat.includes('SWIM')) emoji = '🏊';
            else if (cat.includes('WALK')) emoji = '🚶';
            else if (cat.includes('HIKE')) emoji = '🥾';
            else if (cat.includes('GYM')) emoji = '🏋️';

            card.innerHTML = `
                <div class="dir-challenge-header">
                    <h4 class="dir-challenge-title">${challenge.title}</h4>
                    <span class="dir-challenge-badge ${badgeClass}">${badgeText}</span>
                </div>
                
                <div class="dir-challenge-meta">
                    <span>${emoji}</span>
                    <span>${cat}</span>
                </div>

                <div class="dir-challenge-stats">
                    <div class="dir-stat-row">
                        <span class="dir-stat-label">Goal</span>
                        <span class="dir-stat-value">${goalText}</span>
                    </div>
                    <div class="dir-stat-row">
                        <span class="dir-stat-label">Participants</span>
                        <span class="dir-stat-value">${participantCount}</span>
                    </div>
                </div>
                
                <div class="dir-view-action">
                    View Leaderboard →
                </div>
            `;

            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    fetchChallenges();
});
