document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    
    // Check for error parameters
    const error = params.get('strava_error');
    if (error) {
        const errPanel = document.getElementById('error-panel');
        const errMsg = document.getElementById('error-message');
        errMsg.textContent = decodeURIComponent(error);
        errPanel.classList.remove('hidden');
    }

    // Check for deletion success parameter
    const deleted = params.get('deleted');
    if (deleted === 'true') {
        const successPanel = document.getElementById('success-panel');
        const successMsg = document.getElementById('success-message');
        successMsg.textContent = "Your account and all associated data have been permanently deleted.";
        successPanel.classList.remove('hidden');
    }

    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            document.getElementById('loader').classList.add('show');
            window.location.href = '/api/athletes/strava/login';
        });
    }
});
