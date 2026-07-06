document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Update active nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Update title
            document.getElementById('page-title').innerText = item.innerText.replace(/[0-9]/g, '').trim();
            
            // Show section
            const target = item.getAttribute('data-target');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById('section-' + target).classList.add('active');
            
            // Load data
            if (target === 'dashboard') loadDashboard();
            else if (target === 'pending') loadUsers('pending');
            else if (target === 'approved') loadUsers('approved');
            else if (target === 'rejected') loadUsers('rejected');
            else if (target === 'challenges') loadChallenges();
        });
    });
}

function loadDashboard() {
    fetch('/api/admin/stats')
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/welcome.html';
                throw new Error("Unauthorized");
            }
            return res.json();
        })
        .then(data => {
            document.getElementById('stat-total').innerText = data.totalUsers;
            document.getElementById('stat-pending').innerText = data.pendingUsers;
            document.getElementById('stat-approved').innerText = data.approvedUsers;
            document.getElementById('stat-rejected').innerText = data.rejectedUsers;
            
            const badge = document.getElementById('badge-pending');
            badge.innerText = data.pendingUsers;
            if (data.pendingUsers > 0) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        })
        .catch(console.error);
}

function loadUsers(status) {
    fetch('/api/admin/users/' + status)
        .then(res => res.json())
        .then(users => {
            const tbody = document.getElementById('table-' + status);
            tbody.innerHTML = '';
            
            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No ${status} users found.</td></tr>`;
                return;
            }
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                const avatar = user.avatarUrl || '';
                const date = new Date(user.createdAt || Date.now()).toLocaleDateString();
                
                let actions = '';
                if (status === 'pending') {
                    actions = `
                        <button class="action-btn btn-approve" onclick="approveUser(${user.id})">Approve</button>
                        <button class="action-btn btn-reject" onclick="confirmReject(${user.id})">Reject</button>
                    `;
                } else if (status === 'approved') {
                    actions = `
                        <button class="action-btn btn-revoke" onclick="revokeUser(${user.id})">Suspend</button>
                    `;
                } else if (status === 'rejected') {
                    actions = `
                        <button class="action-btn btn-approve" onclick="approveUser(${user.id})">Approve</button>
                        <button class="action-btn btn-reject" onclick="confirmDelete(${user.id})">Delete</button>
                    `;
                }
                
                tr.innerHTML = `
                    <td>
                        <div class="user-profile-cell">
                            ${avatar ? `<img src="${avatar}" class="user-avatar">` : `<div class="user-avatar"></div>`}
                        </div>
                    </td>
                    <td><strong>${user.name}</strong><br><small style="color:#94a3b8">${user.stravaId}</small></td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${date}</td>
                    ${status === 'approved' ? `<td><span class="badge ${user.role==='ADMIN'?'':'hidden'}">ADMIN</span></td>` : ''}
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            });
        });
}

function approveUser(id) {
    fetch(`/api/admin/users/${id}/approve`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            showToast("User approved successfully!", "success");
            loadDashboard();
            const activeTarget = document.querySelector('.nav-item.active').getAttribute('data-target');
            if (activeTarget !== 'dashboard') loadUsers(activeTarget);
        });
}

function revokeUser(id) {
    fetch(`/api/admin/users/${id}/revoke`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            showToast("User suspended successfully.", "warning");
            loadDashboard();
            loadUsers('approved');
        });
}

let pendingAction = null;

function confirmReject(id) {
    pendingAction = () => {
        fetch(`/api/admin/users/${id}/reject`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                showToast("User rejected.", "error");
                closeModal();
                loadDashboard();
                loadUsers('pending');
            });
    };
    showModal("Reject User", "Are you sure you want to reject this user? They will not be able to access the app.");
}

function confirmDelete(id) {
    pendingAction = () => {
        fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                showToast("User deleted permanently.", "error");
                closeModal();
                loadDashboard();
                loadUsers('rejected');
            });
    };
    showModal("Delete User", "Are you sure you want to permanently delete this user's data?");
}

function showModal(title, text) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    document.getElementById('confirm-modal').classList.remove('hidden');
    
    document.getElementById('modal-confirm-btn').onclick = () => {
        if (pendingAction) pendingAction();
    };
}

function closeModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    pendingAction = null;
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

// Challenge Management
function loadChallenges() {
    fetch('/api/challenges')
        .then(res => res.json())
        .then(challenges => {
            const tbody = document.getElementById('table-challenges');
            tbody.innerHTML = '';
            
            if (challenges.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No challenges found.</td></tr>`;
                return;
            }
            
            challenges.forEach(c => {
                const tr = document.createElement('tr');
                const startDate = new Date(c.startDate).toLocaleDateString();
                const endDate = new Date(c.endDate).toLocaleDateString();
                
                let actions = `
                    <button class="action-btn" onclick='openChallengeModal(${JSON.stringify(c).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="action-btn btn-reject" onclick="confirmDeleteChallenge(${c.id})">Delete</button>
                `;
                
                if (c.status === 'Draft' || c.status === 'Scheduled') {
                    actions += `<button class="action-btn btn-approve" onclick="updateChallengeStatus(${c.id}, 'Active')">Start</button>`;
                } else if (c.status === 'Active') {
                    actions += `<button class="action-btn btn-revoke" onclick="updateChallengeStatus(${c.id}, 'Completed')">End</button>`;
                }

                tr.innerHTML = `
                    <td><strong>${c.title}</strong><br><small style="color:#94a3b8">${c.goalType}: ${c.targetValue} ${c.unit}</small></td>
                    <td>${c.activityType}</td>
                    <td><span class="badge ${c.status === 'Active' ? 'success' : (c.status === 'Completed' ? '' : 'warning')}">${c.status}</span></td>
                    <td>${startDate} - ${endDate}</td>
                    <td>${c.participantCount || 0}</td>
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(console.error);
}

function openChallengeModal(challenge = null) {
    const modal = document.getElementById('challenge-modal');
    const form = document.getElementById('challenge-form');
    document.getElementById('challenge-modal-title').innerText = challenge ? 'Edit Challenge' : 'Add Challenge';
    
    if (challenge) {
        document.getElementById('challenge-id').value = challenge.id;
        document.getElementById('challenge-title').value = challenge.title;
        document.getElementById('challenge-description').value = challenge.description;
        document.getElementById('challenge-activity-type').value = challenge.activityType || 'Run';
        document.getElementById('challenge-goal-type').value = challenge.goalType || 'Distance';
        document.getElementById('challenge-target').value = challenge.targetValue || '';
        document.getElementById('challenge-unit').value = challenge.unit || '';
        
        // Format dates for datetime-local input (no timezone shift)
        const formatDate = (dateString) => {
            if (!dateString) return '';
            // Backend sends "2026-07-06T14:59:00" or similar
            // datetime-local expects "YYYY-MM-DDTHH:mm"
            return dateString.slice(0, 16);
        };
        
        document.getElementById('challenge-start').value = formatDate(challenge.startDate);
        document.getElementById('challenge-end').value = formatDate(challenge.endDate);
        document.getElementById('challenge-reg-start').value = formatDate(challenge.registrationStartDate);
        document.getElementById('challenge-reg-end').value = formatDate(challenge.registrationEndDate);
        document.getElementById('challenge-banner').value = challenge.bannerImage || '';
        document.getElementById('challenge-status').value = challenge.status || 'Draft';
    } else {
        form.reset();
        document.getElementById('challenge-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

function closeChallengeModal() {
    document.getElementById('challenge-modal').classList.add('hidden');
}

document.getElementById('challenge-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('challenge-id').value;
    
    const formatForBackend = (val) => val ? val + ":00" : null;
    
    const payload = {
        title: document.getElementById('challenge-title').value,
        description: document.getElementById('challenge-description').value,
        activityType: document.getElementById('challenge-activity-type').value,
        goalType: document.getElementById('challenge-goal-type').value,
        targetValue: parseFloat(document.getElementById('challenge-target').value),
        unit: document.getElementById('challenge-unit').value,
        startDate: formatForBackend(document.getElementById('challenge-start').value),
        endDate: formatForBackend(document.getElementById('challenge-end').value),
        registrationStartDate: formatForBackend(document.getElementById('challenge-reg-start').value),
        registrationEndDate: formatForBackend(document.getElementById('challenge-reg-end').value),
        bannerImage: document.getElementById('challenge-banner').value,
        status: document.getElementById('challenge-status').value,
        isPublic: true
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? '/api/challenges/' + id : '/api/challenges';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to save challenge");
        return res.json();
    })
    .then(data => {
        showToast("Challenge saved successfully!", "success");
        closeChallengeModal();
        loadChallenges();
    })
    .catch(err => {
        showToast(err.message, "error");
    });
});

function confirmDeleteChallenge(id) {
    pendingAction = () => {
        fetch(`/api/challenges/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                showToast("Challenge deleted.", "error");
                closeModal();
                loadChallenges();
            });
    };
    showModal("Delete Challenge", "Are you sure you want to delete this challenge?");
}

function updateChallengeStatus(id, status) {
    fetch(`/api/challenges/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(data => {
        showToast("Challenge status updated.", "success");
        loadChallenges();
    });
}
