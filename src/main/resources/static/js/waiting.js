document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', checkStatus);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Auto-poll every 15 seconds
    setInterval(() => {
        fetch('/api/auth/status')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'APPROVED') {
                    window.location.href = '/home.html';
                } else if (data.status === 'REJECTED') {
                    window.location.href = '/welcome.html?deleted=true';
                }
            })
            .catch(() => {});
    }, 15000);
});

function checkStatus() {
    const btn = document.getElementById('refresh-btn');
    if (!btn) return;
    const originalText = btn.innerText;
    btn.innerText = 'Checking...';
    btn.disabled = true;

    fetch('/api/auth/status')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'APPROVED') {
                window.location.href = '/home.html';
            } else if (data.status === 'REJECTED') {
                window.location.href = '/welcome.html?deleted=true';
            } else {
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }, 500);
            }
        })
        .catch(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        });
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        window.location.href = '/welcome.html';
    });
}
