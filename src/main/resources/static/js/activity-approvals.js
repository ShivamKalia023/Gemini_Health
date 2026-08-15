document.addEventListener('DOMContentLoaded', () => {
    loadActivityApprovals();

    document.getElementById('btn-retry').addEventListener('click', loadActivityApprovals);
});

function loadActivityApprovals() {
    const tbody = document.getElementById('table-activity-approvals');
    const tableContainer = document.getElementById('activity-approvals-table');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');

    // Show loading, hide others
    tbody.innerHTML = '';
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    tableContainer.classList.add('hidden');

    fetch('/api/admin/activity-submissions/pending')
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/welcome.html';
                throw new Error("Unauthorized");
            }
            if (!res.ok) throw new Error("Failed to load");
            return res.json();
        })
        .then(submissions => {
            loadingState.classList.add('hidden');
            
            if (!submissions || submissions.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }
            
            tableContainer.classList.remove('hidden');
            
            submissions.forEach(sub => {
                const tr = document.createElement('tr');
                const date = new Date(sub.startDate).toLocaleDateString();
                const dist = sub.distance ? sub.distance.toFixed(2) + ' km' : '--';
                
                tr.innerHTML = `
                    <td><strong>${sub.athlete.name}</strong></td>
                    <td>${sub.name}</td>
                    <td>${sub.type}</td>
                    <td>${date}</td>
                    <td>${dist}</td>
                    <td>
                        <button class="action-btn" data-action="review-activity" data-activity='${JSON.stringify(sub).replace(/'/g, "&#39;")}'>VIEW</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            if (err.message !== "Unauthorized") {
                loadingState.classList.add('hidden');
                errorState.classList.remove('hidden');
            }
        });
}

// Global Event Delegation for dynamic buttons
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;

    if (target.matches('[data-action="review-activity"]')) {
        const activityData = JSON.parse(target.getAttribute('data-activity').replace(/&#39;/g, "'"));
        openActivityReviewModal(activityData);
    }
});

function openActivityReviewModal(activity) {
    const modal = document.getElementById('activity-review-modal');
    const content = document.getElementById('activity-review-content');
    
    const date = new Date(activity.startDate).toLocaleString();
    const submitted = new Date(activity.submittedAt || Date.now()).toLocaleString();
    
    let html = `
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;">
            <strong style="color: var(--text-secondary);">Athlete:</strong> <span>${activity.athlete.name}</span>
            <strong style="color: var(--text-secondary);">Activity:</strong> <span>${activity.name}</span>
            <strong style="color: var(--text-secondary);">Type:</strong> <span>${activity.type}</span>
            <strong style="color: var(--text-secondary);">Start:</strong> <span>${date}</span>
            <strong style="color: var(--text-secondary);">Distance:</strong> <span>${activity.distance} km</span>
            <strong style="color: var(--text-secondary);">Elapsed:</strong> <span>${Math.round(activity.elapsedTime / 60)} min</span>
            <strong style="color: var(--text-secondary);">Moving:</strong> <span>${Math.round((activity.movingTime || activity.elapsedTime) / 60)} min</span>
            <strong style="color: var(--text-secondary);">Submitted:</strong> <span>${submitted}</span>
        </div>
    `;

    if (activity.averageHr) html += `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px; margin-top: 10px;"><strong style="color: var(--text-secondary);">Avg HR:</strong> <span>${activity.averageHr} bpm</span></div>`;
    if (activity.maxHr) html += `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;"><strong style="color: var(--text-secondary);">Max HR:</strong> <span>${activity.maxHr} bpm</span></div>`;
    if (activity.averageSpeed) html += `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;"><strong style="color: var(--text-secondary);">Avg Speed:</strong> <span>${activity.averageSpeed} km/h</span></div>`;
    if (activity.averageWatts) html += `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;"><strong style="color: var(--text-secondary);">Avg Watts:</strong> <span>${activity.averageWatts} W</span></div>`;
    if (activity.totalElevationGain) html += `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;"><strong style="color: var(--text-secondary);">Elevation:</strong> <span>${activity.totalElevationGain} m</span></div>`;

    content.innerHTML = html;
    
    document.getElementById('rejection-reason-container').classList.add('hidden');
    document.getElementById('rejection-reason').value = '';
    
    const approveBtn = document.getElementById('btn-submit-approve');
    const rejectBtn = document.getElementById('btn-submit-reject');
    
    approveBtn.classList.remove('hidden');
    rejectBtn.classList.remove('hidden');
    rejectBtn.textContent = 'Reject'; // reset text
    
    rejectBtn.onclick = () => {
        const reasonContainer = document.getElementById('rejection-reason-container');
        if (reasonContainer.classList.contains('hidden')) {
            reasonContainer.classList.remove('hidden');
            rejectBtn.textContent = 'Confirm Rejection';
        } else {
            submitActivityDecision(activity.id, 'reject', document.getElementById('rejection-reason').value);
        }
    };
    
    approveBtn.onclick = () => {
        submitActivityDecision(activity.id, 'approve');
    };
    
    document.getElementById('btn-close-review-modal').onclick = () => {
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

function submitActivityDecision(id, action, reason = null) {
    const url = `/api/admin/activity-submissions/${id}/${action}`;
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (reason) options.body = JSON.stringify({ reason });
    
    fetch(url, options)
        .then(async res => {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/welcome.html';
                throw new Error("Unauthorized");
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        })
        .then(data => {
            showToast(data.message || 'Success', 'success');
            document.getElementById('activity-review-modal').classList.add('hidden');
            loadActivityApprovals();
            // Optional: update badge in sidebar if desired by emitting an event or direct fetch
        })
        .catch(err => {
            showToast(err.message, 'error');
        });
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    else if (type === 'warning') toast.style.borderLeftColor = '#fbbf24';
    else toast.style.borderLeftColor = '#10b981';
    
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
