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
