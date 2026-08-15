document.addEventListener('DOMContentLoaded', () => {
    
    // --- Add Activity Form Logic ---
    const typeSelect = document.getElementById('activity-type');
    const optionalFields = document.getElementById('optional-fields-container');
    const movingTimeContainer = document.getElementById('moving-time-container');
    const form = document.getElementById('add-activity-form');
    const submitBtn = document.getElementById('add-activity-btn');
    const messageEl = document.getElementById('add-activity-message');
    const modal = document.getElementById('add-activity-modal');
    const btnOpenModal = document.getElementById('btn-add-activity-manual');
    const btnCancel = document.getElementById('btn-cancel-activity');

    if (btnOpenModal && modal) {
        btnOpenModal.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (btnCancel && modal) {
        btnCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
            form.reset();
            typeSelect.dispatchEvent(new Event('change'));
            messageEl.textContent = '';
        });
    }

    if (typeSelect && form) {
        typeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (!type) {
                optionalFields.style.display = 'none';
                return;
            }
            optionalFields.style.display = 'flex';
            
            const isRun = type === 'Run';
            const isRide = type === 'Ride';
            const isWalk = type === 'Walk';
            const isHike = type === 'Hike';
            const isSwim = type === 'Swim';
            const isWorkout = type === 'Workout';

            // moving time is mostly always there except maybe swim/workout where it's just duration
            if (isSwim || isWorkout) {
                movingTimeContainer.style.display = 'none';
                document.getElementById('activity-moving-time').value = '';
            } else {
                movingTimeContainer.style.display = 'block';
            }

            // Speed
            const speedField = document.querySelector('.speed-field');
            if (isRun || isRide || isWalk || isSwim) {
                speedField.style.display = 'block';
            } else {
                speedField.style.display = 'none';
                document.getElementById('activity-avg-speed').value = '';
            }

            // Elevation
            const elevField = document.querySelector('.elevation-field');
            if (isRun || isRide || isWalk || isHike) {
                elevField.style.display = 'block';
            } else {
                elevField.style.display = 'none';
                document.getElementById('activity-elevation').value = '';
            }

            // Watts
            const wattsField = document.querySelector('.watts-field');
            if (isRide) {
                wattsField.style.display = 'flex';
            } else {
                wattsField.style.display = 'none';
                document.getElementById('activity-avg-watts').value = '';
            }

            // HR
            const hrFields = document.querySelector('.hr-fields');
            hrFields.style.display = 'flex'; // Usually available for everything
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            messageEl.textContent = '';
            
            const payload = {
                type: document.getElementById('activity-type').value,
                name: document.getElementById('activity-name').value,
                startDate: document.getElementById('activity-start-date').value,
                distance: parseFloat(document.getElementById('activity-distance').value),
                elapsedTime: parseInt(document.getElementById('activity-elapsed-time').value) * 60, // save as seconds
            };

            const movingTimeVal = document.getElementById('activity-moving-time').value;
            if (movingTimeVal) payload.movingTime = parseInt(movingTimeVal) * 60;
            
            const avgHrVal = document.getElementById('activity-avg-hr').value;
            if (avgHrVal) payload.averageHr = parseInt(avgHrVal);
            
            const maxHrVal = document.getElementById('activity-max-hr').value;
            if (maxHrVal) payload.maxHr = parseInt(maxHrVal);
            
            const speedVal = document.getElementById('activity-avg-speed').value;
            if (speedVal) payload.averageSpeed = parseFloat(speedVal);
            
            const elevVal = document.getElementById('activity-elevation').value;
            if (elevVal) payload.totalElevationGain = parseFloat(elevVal);
            
            const wattsVal = document.getElementById('activity-avg-watts').value;
            if (wattsVal) payload.averageWatts = parseFloat(wattsVal);

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const res = await fetch('/api/activity-submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    messageEl.textContent = 'Activity submitted for admin approval.';
                    messageEl.style.color = '#10b981';
                    fetchMyRequests(); // Refresh the list
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        form.reset();
                        typeSelect.dispatchEvent(new Event('change')); // hide optional fields
                        messageEl.textContent = '';
                    }, 1500);
                } else {
                    const err = await res.json();
                    messageEl.textContent = err.error || 'Failed to submit activity.';
                    messageEl.style.color = '#ef4444';
                }
            } catch (err) {
                console.error(err);
                messageEl.textContent = 'Network error occurred.';
                messageEl.style.color = '#ef4444';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit for Approval';
            }
        });
    }

    // --- My Activity Requests Logic ---
    const requestsList = document.getElementById('my-requests-list');
    
    async function fetchMyRequests() {
        if (!requestsList) return;
        
        try {
            const res = await fetch('/api/activity-submissions/me');
            if (res.ok) {
                const data = await res.json();
                renderRequests(data);
            }
        } catch (err) {
            console.error(err);
            requestsList.innerHTML = '<div style="color: #ef4444; font-size: 13px;">Failed to load requests.</div>';
        }
    }

    function renderRequests(requests) {
        requestsList.innerHTML = '';
        if (requests.length === 0) {
            requestsList.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 20px;">No activity requests yet.</div>';
            return;
        }

        requests.forEach(req => {
            let statusColor = '#fbbf24'; // Pending yellow
            let statusText = '⏳ Pending Approval';
            if (req.status === 'APPROVED') {
                statusColor = '#10b981'; // Green
                statusText = '✓ Approved';
            } else if (req.status === 'REJECTED') {
                statusColor = '#ef4444'; // Red
                statusText = '✕ Rejected';
            }

            const dateObj = new Date(req.startDate);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            const div = document.createElement('div');
            div.style.background = 'var(--bg-body)';
            div.style.padding = '12px';
            div.style.borderRadius = '8px';
            div.style.border = '1px solid var(--border-color)';

            let rejectionHtml = '';
            if (req.status === 'REJECTED' && req.rejectionReason) {
                rejectionHtml = `
                    <div style="margin-top: 8px; font-size: 11px; color: #b91c1c; background: #fee2e2; padding: 8px; border-radius: 4px; border-left: 2px solid #ef4444;">
                        <strong>Reason:</strong> ${req.rejectionReason}
                    </div>
                `;
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                    <div>
                        <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${req.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${req.type} · ${req.distance ? req.distance.toFixed(1) : 0} km · ${dateStr}</div>
                    </div>
                    <div style="color: ${statusColor}; font-size: 12px; font-weight: 600;">
                        ${statusText}
                    </div>
                </div>
                ${rejectionHtml}
            `;
            requestsList.appendChild(div);
        });
    }

    // Initial load
    fetchMyRequests();
});
