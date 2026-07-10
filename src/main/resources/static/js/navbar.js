document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject HTML
    const currentPath = window.location.pathname.split('/').pop() || 'home.html';
    
    // Only inject if there's a .top-nav
    const topNav = document.querySelector('.top-nav');
    if (topNav) {
        topNav.innerHTML = `
        <div class="brand">
            <a href="home.html" style="text-decoration: none; color: inherit;">
                <h2>GFG Tracker</h2>
                <span class="subtitle">Gemini Fitness Group</span>
            </a>
        </div>
        <nav class="main-nav">
            <a href="home.html" class="nav-link ${currentPath === 'home.html' ? 'active' : ''}">Home</a>
            <a href="feed.html" class="nav-link ${currentPath === 'feed.html' ? 'active' : ''}">Feed</a>
            <a href="challenges.html" class="nav-link ${currentPath === 'challenges.html' ? 'active' : ''}">Challenges</a>
            <a href="dashboard.html" class="nav-link ${currentPath === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
            <a href="leaderboard.html" class="nav-link ${currentPath === 'leaderboard.html' ? 'active' : ''}">Leaderboards</a>
        </nav>
        <div class="nav-right-container" style="display: flex; align-items: center; gap: 16px;">
            <div id="last-updated-ticker" style="font-size: 12px; color: #94a3b8; font-weight: 500;" class="last-updated-text hidden-mobile"></div>
            <div class="nav-actions"></div>
        </div>
        `;
    }

    // 2. Init User Menu
    initUserMenuShared();
});

async function initUserMenuShared() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    let athleteId = null;
    let isAdmin = false;

    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const user = await res.json();
            athleteId = user.id;
            isAdmin = user.role === 'ADMIN';
        }
    } catch (e) {
        console.error("Auth check failed in navbar", e);
    }

    if (!athleteId) {
        navActions.innerHTML = '';
        const connectBtn = document.createElement('button');
        connectBtn.id = 'strava-connect-btn';
        connectBtn.className = 'strava-connect-btn';
        connectBtn.textContent = 'Connect with Strava';
        connectBtn.addEventListener('click', () => {
            window.location.href = '/api/auth/strava';
        });
        navActions.appendChild(connectBtn);
        return;
    }

    try {
        const response = await fetch(`/api/athletes/${athleteId}`);
        if (!response.ok) throw new Error('Failed to fetch athlete');
        const athlete = await response.json();

        navActions.innerHTML = ''; 

        const menuContainer = document.createElement('div');
        menuContainer.className = 'user-profile-menu';
        menuContainer.style.position = 'relative';
        menuContainer.style.display = 'inline-block';

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

        const createDropdownLink = (text, onClick) => {
            const link = document.createElement('button');
            link.style.width = '100%';
            link.style.padding = '12px 16px';
            link.style.background = 'transparent';
            link.style.border = 'none';
            link.style.color = 'var(--text-primary, #1a1a1a)';
            link.style.fontSize = '14px';
            link.style.fontFamily = "'Outfit', 'Inter', sans-serif";
            link.style.fontWeight = '500';
            link.style.textAlign = 'left';
            link.style.cursor = 'pointer';
            link.style.display = 'block';
            link.style.transition = 'all 0.2s';
            link.innerHTML = `<span>${text}</span>`;
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

        const profileLink = createDropdownLink('👤 My Profile', () => {
            window.location.href = `profile.html?id=${athleteId}`;
        });
        
        let adminLink = null;
        if (isAdmin) {
            adminLink = createDropdownLink('🛡️ Admin Panel', () => {
                window.location.href = 'admin.html';
            });
        }
        
        const logoutLink = createDropdownLink('🚪 Log Out', () => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                window.location.href = 'welcome.html';
            });
        });

        if (adminLink) dropdown.appendChild(adminLink);
        dropdown.appendChild(profileLink);
        dropdown.appendChild(logoutLink);

        menuContainer.appendChild(avatarBtn);
        menuContainer.appendChild(dropdown);
        navActions.appendChild(menuContainer);

        let menuOpen = false;
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuOpen = !menuOpen;
            if (menuOpen) {
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0)';
                dropdown.style.pointerEvents = 'auto';
            } else {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                dropdown.style.pointerEvents = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (menuOpen && !menuContainer.contains(e.target)) {
                menuOpen = false;
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                dropdown.style.pointerEvents = 'none';
            }
        });
    } catch (e) {
        console.error('Error initializing user menu:', e);
    }
}
