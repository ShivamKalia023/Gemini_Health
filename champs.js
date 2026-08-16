// ===== Champs Preview Logic =====
async function loadChamps() {
    const champsContainer = document.getElementById('champs-cards-container');
    if (!champsContainer) return;

    try {
        const res = await fetch('/api/dashboard/champs');
        
        if (!res.ok) {
            throw new Error('Failed to load champs');
        }

        const champsData = await res.json();
        champsContainer.innerHTML = '';

        if (!champsData || champsData.length === 0) {
            champsContainer.innerHTML = '<div class="champs-empty-state">No champion statistics available yet.</div>';
            return;
        }

        champsData.forEach(champ => {
            const avatar = champ.athlete && champ.athlete.avatarUrl ? champ.athlete.avatarUrl : '';
            const name = champ.athlete && champ.athlete.name ? champ.athlete.name : 'Unknown';
            const athleteId = champ.athlete && champ.athlete.id ? champ.athlete.id : '';

            const card = document.createElement('div');
            card.className = 'champ-card';
            card.onclick = () => {
                if (athleteId) window.location.href = '/profile.html?id=' + athleteId;
            };

            card.innerHTML = \
                <img src="\ + avatar + \" class="champ-avatar" alt="\ + name + \" onerror="this.src=''; this.style.backgroundColor='#333';">
                <div class="champ-info">
                    <div class="champ-title-badge">
                        <span>\ + (champ.badge || '') + \</span>
                        <span>\ + (champ.title || '') + \</span>
                    </div>
                    <div class="champ-name">\ + name + \</div>
                    <div class="champ-metric">\ + (champ.icon || '') + \ \ + (champ.metric || '') + \</div>
                </div>
            \;

            champsContainer.appendChild(card);
        });

    } catch(e) {
        console.error('Failed to load champs preview', e);
        champsContainer.innerHTML = '<div class="champs-empty-state">Failed to load champions.</div>';
    }
}
