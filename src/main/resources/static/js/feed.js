// feed.js

document.addEventListener('DOMContentLoaded', () => {
    const postsContainer = document.getElementById('feed-posts-container');
    const submitBtn = document.getElementById('submit-post-btn');
    const captionInput = document.getElementById('post-caption-input');
    
    // Activity Picker Elements
    const openPickerBtn = document.getElementById('open-activity-picker-btn');
    const activityModal = document.getElementById('activity-picker-modal');
    const closePickerBtn = document.getElementById('close-modal-btn');
    const activityListContainer = document.getElementById('activity-list-container');
    const selectedActivityPreview = document.getElementById('selected-activity-preview');

    let currentAthleteId = null;
    let selectedActivityId = null;
    let currentPage = 0;
    let isLoading = false;
    let hasMorePosts = true;

    let currentUserIsAdmin = false;

    // Authentication Check
    async function initAuth() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const user = await res.json();
                currentAthleteId = user.id;
                currentUserIsAdmin = user.role === 'ADMIN';
                fetchPosts();
            } else {
                postsContainer.innerHTML = '<div class="loading-spinner">Please log in to view the feed.</div>';
            }
        } catch (e) {
            postsContainer.innerHTML = '<div class="loading-spinner">Please log in to view the feed.</div>';
        }
    }

    initAuth();

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (!isLoading && hasMorePosts) {
                fetchPosts();
            }
        }
    });

    // --- Create Post Logic ---

    submitBtn.addEventListener('click', async () => {
        const caption = captionInput.value.trim();
        if (!caption && !selectedActivityId) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            const response = await fetch('/api/feed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    caption: caption,
                    activityId: selectedActivityId
                })
            });

            if (response.ok) {
                const newPost = await response.json();
                captionInput.value = '';
                selectedActivityId = null;
                selectedActivityPreview.style.display = 'none';
                selectedActivityPreview.innerHTML = '';
                openPickerBtn.innerHTML = '<span style="font-size: 16px;">+</span> Attach Activity';
                openPickerBtn.classList.remove('selected');
                
                // Prepend new post
                const postElement = createPostElement(newPost);
                postsContainer.insertBefore(postElement, postsContainer.firstChild);
            } else {
                alert('Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Error creating post');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    });

    // --- Activity Picker Logic ---

    openPickerBtn.addEventListener('click', () => {
        activityModal.classList.add('active');
        fetchRecentActivities();
    });

    closePickerBtn.addEventListener('click', () => {
        activityModal.classList.remove('active');
    });

    async function fetchRecentActivities() {
        activityListContainer.innerHTML = '<div class="loading-spinner">Loading your recent activities...</div>';
        try {
            // Reusing dashboard feed endpoint but filtering for current athlete locally, 
            // ideally we should have a specific endpoint but this works for now.
            const response = await fetch('/api/dashboard/feed?timeFilter=all');
            if (response.ok) {
                const activities = await response.json();
                const myActivities = activities.filter(a => a.athlete.id == currentAthleteId);
                
                if (myActivities.length === 0) {
                    activityListContainer.innerHTML = '<div style="text-align:center; color:#64748b; padding: 20px;">No recent activities found.</div>';
                    return;
                }

                activityListContainer.innerHTML = '';
                myActivities.forEach(activity => {
                    const el = document.createElement('div');
                    el.className = `activity-select-item ${selectedActivityId == activity.id ? 'selected' : ''}`;
                    
                    const date = new Date(activity.startDate).toLocaleDateString();
                    const distance = activity.distance ? activity.distance.toFixed(2) + ' km' : '-';
                    
                    el.innerHTML = `
                        <div>
                            <div style="font-weight: 600; color: #1e293b;">${activity.name || activity.type}</div>
                            <div style="font-size: 13px; color: #64748b;">${date} • ${activity.type} • ${distance}</div>
                        </div>
                    `;
                    
                    el.addEventListener('click', () => {
                        selectedActivityId = activity.id;
                        activityModal.classList.remove('active');
                        renderSelectedActivityPreview(activity);
                    });
                    
                    activityListContainer.appendChild(el);
                });
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            activityListContainer.innerHTML = '<div style="color:red; text-align:center;">Failed to load activities.</div>';
        }
    }

    function renderSelectedActivityPreview(activity) {
        openPickerBtn.innerHTML = '✓ Activity Attached (Change)';
        openPickerBtn.classList.add('selected');
        
        selectedActivityPreview.style.display = 'flex';
        
        const distance = activity.distance ? activity.distance.toFixed(2) + ' km' : '-';
        const movingTime = formatTime(activity.movingTime);
        const elev = activity.totalElevationGain ? activity.totalElevationGain.toFixed(0) + ' m' : '-';

        selectedActivityPreview.innerHTML = `
            <div class="activity-header">
                <span class="activity-type-icon">🏃</span>
                <span>${activity.name || activity.type}</span>
            </div>
            <div class="activity-stats">
                <div class="stat-item">
                    <span class="stat-label">Distance</span>
                    <span class="stat-value">${distance}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Moving Time</span>
                    <span class="stat-value">${movingTime}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Elevation</span>
                    <span class="stat-value">${elev}</span>
                </div>
            </div>
            <button type="button" style="align-self: flex-start; background:none; border:none; color:#ef4444; font-size:13px; cursor:pointer; margin-top:8px;" data-action="remove-activity">Remove Activity</button>
        `;
    }

    window.removeAttachedActivity = function() {
        selectedActivityId = null;
        selectedActivityPreview.style.display = 'none';
        selectedActivityPreview.innerHTML = '';
        openPickerBtn.innerHTML = '<span style="font-size: 16px;">+</span> Attach Activity';
        openPickerBtn.classList.remove('selected');
    };

    // --- Feed Logic ---

    async function fetchPosts() {
        if (isLoading) return;
        isLoading = true;

        if (currentPage === 0) {
            postsContainer.innerHTML = '<div class="loading-spinner">Loading feed...</div>';
        }

        try {
            const response = await fetch(`/api/feed?page=${currentPage}&size=10`);
            if (response.ok) {
                const data = await response.json();
                
                if (currentPage === 0) {
                    postsContainer.innerHTML = '';
                }

                if (data.content.length === 0) {
                    hasMorePosts = false;
                    if (currentPage === 0) {
                        postsContainer.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 40px;">No posts yet. Be the first to post!</div>';
                    } else {
                        const noMoreEl = document.createElement('div');
                        noMoreEl.style = "text-align:center; color:#94a3b8; padding: 20px;";
                        noMoreEl.textContent = "No more posts to load.";
                        postsContainer.appendChild(noMoreEl);
                    }
                } else {
                    data.content.forEach(post => {
                        postsContainer.appendChild(createPostElement(post));
                    });
                    currentPage++;
                    if (data.last) {
                        hasMorePosts = false;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching feed:', error);
            if (currentPage === 0) {
                postsContainer.innerHTML = '<div style="color:red; text-align:center;">Failed to load feed.</div>';
            }
        } finally {
            isLoading = false;
        }
    }

    function createPostElement(post) {
        const el = document.createElement('div');
        el.className = 'post-card';
        el.id = `post-${post.id}`;

        const isOwner = post.athlete.id == currentAthleteId;
        const deleteBtnHtml = (isOwner || currentUserIsAdmin) ? `<button class="post-delete-btn" data-action="delete-post" data-post-id="${post.id}">Delete</button>` : '';

        const timeAgo = formatTimeAgo(post.createdAt);
        const name = post.athlete.name || 'Unknown User';
        const avatarUrl = post.athlete.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);

        let activityHtml = '';
        if (post.activity) {
            const act = post.activity;
            const distance = act.distance ? act.distance.toFixed(2) + ' km' : '-';
            const movingTime = formatTime(act.movingTime);
            const elev = act.totalElevationGain ? act.totalElevationGain.toFixed(0) + ' m' : '-';
            
            activityHtml = `
                <div class="post-activity-card">
                    <div class="activity-header">
                        <span class="activity-type-icon">🏃</span>
                        <span>${act.name || act.type}</span>
                    </div>
                    <div class="activity-stats">
                        <div class="stat-item">
                            <span class="stat-label">Distance</span>
                            <span class="stat-value">${distance}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Moving Time</span>
                            <span class="stat-value">${movingTime}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Elevation</span>
                            <span class="stat-value">${elev}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const captionHtml = post.caption ? `<div class="post-caption">${escapeHtml(post.caption)}</div>` : '';
        const likeIconColor = post.likedByCurrentUser ? 'color: #ef4444;' : '';

        el.innerHTML = `
            <div class="post-header">
                <div class="post-author-info">
                    <img src="${avatarUrl}" class="author-avatar" alt="Avatar">
                    <div>
                        <a href="profile.html?id=${post.athlete.id}" class="author-name">${name}</a>
                        <div class="post-timestamp">${timeAgo}</div>
                    </div>
                </div>
                ${deleteBtnHtml}
            </div>
            ${captionHtml}
            ${activityHtml}
            <div class="post-actions">
                <button class="action-btn ${post.likedByCurrentUser ? 'liked' : ''}" id="like-btn-${post.id}" data-action="toggle-like" data-post-id="${post.id}" data-liked="${post.likedByCurrentUser}">
                    <span style="${likeIconColor}">♥</span> <span id="like-count-${post.id}">${post.likeCount || 0}</span>
                </button>
                <button class="action-btn" data-action="toggle-comments" data-post-id="${post.id}">
                    💬 <span id="comment-count-${post.id}">${post.commentCount || 0}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-section-${post.id}" style="display:none;">
                <div class="comment-list" id="comment-list-${post.id}"></div>
                <div class="comment-input-area">
                    <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Add a comment...">
                    <button class="comment-submit-btn" data-action="submit-comment" data-post-id="${post.id}">Post</button>
                </div>
            </div>
        `;
        return el;
    }

    // --- Interactions ---

    window.deletePost = async function(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const response = await fetch(`/api/feed/${postId}`, { method: 'DELETE' });
            if (response.ok) {
                const el = document.getElementById(`post-${postId}`);
                if (el) el.remove();
                alert('Post deleted successfully');
            } else if (response.status === 403) {
                alert('You do not have permission to delete this post.');
            } else {
                alert('Failed to delete the post.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while deleting the post.');
        }
    };

    window.toggleLike = async function(postId, currentlyLiked) {
        const btn = document.getElementById(`like-btn-${postId}`);
        const countSpan = document.getElementById(`like-count-${postId}`);
        const iconSpan = btn.querySelector('span');
        
        let count = parseInt(countSpan.textContent) || 0;
        
        if (currentlyLiked) {
            // Unlike optimistically
            btn.classList.remove('liked');
            iconSpan.style.color = '';
            countSpan.textContent = count > 0 ? count - 1 : 0;
            btn.setAttribute('data-liked', 'false');
            
            await fetch(`/api/feed/${postId}/like`, { method: 'DELETE' });
        } else {
            // Like optimistically
            btn.classList.add('liked');
            iconSpan.style.color = '#ef4444';
            countSpan.textContent = count + 1;
            btn.setAttribute('data-liked', 'true');
            
            await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
        }
    };

    window.toggleComments = async function(postId) {
        const section = document.getElementById(`comments-section-${postId}`);
        const list = document.getElementById(`comment-list-${postId}`);
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            list.innerHTML = '<div style="font-size:12px; color:#94a3b8; text-align:center;">Loading comments...</div>';
            
            try {
                const res = await fetch(`/api/feed/${postId}/comments`);
                if (res.ok) {
                    const comments = await res.json();
                    list.innerHTML = '';
                    if (comments.length === 0) {
                        list.innerHTML = '<div style="font-size:12px; color:#94a3b8; text-align:center;">No comments yet.</div>';
                    } else {
                        comments.forEach(c => {
                            list.appendChild(createCommentElement(c));
                        });
                    }
                }
            } catch (e) {
                console.error(e);
                list.innerHTML = '<div style="color:red; font-size:12px;">Error loading comments.</div>';
            }
        } else {
            section.style.display = 'none';
        }
    };

    window.submitComment = async function(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        const content = input.value.trim();
        if (!content) return;

        input.disabled = true;
        try {
            const res = await fetch(`/api/feed/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            });

            if (res.ok) {
                const comment = await res.json();
                input.value = '';
                
                const list = document.getElementById(`comment-list-${postId}`);
                // Remove the "no comments yet" message if it exists
                if (list.innerHTML.includes('No comments yet.')) {
                    list.innerHTML = '';
                }
                list.appendChild(createCommentElement(comment));
                
                // Update comment count
                const countSpan = document.getElementById(`comment-count-${postId}`);
                countSpan.textContent = (parseInt(countSpan.textContent) || 0) + 1;
            }
        } catch (e) {
            console.error(e);
        } finally {
            input.disabled = false;
        }
    };

    window.deleteComment = async function(commentId, postId) {
        if (!confirm('Delete comment?')) return;
        try {
            const res = await fetch(`/api/feed/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                const el = document.getElementById(`comment-${commentId}`);
                if (el) el.remove();
                
                const countSpan = document.getElementById(`comment-count-${postId}`);
                let count = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = count > 0 ? count - 1 : 0;
            } else if (res.status === 403) {
                alert('You do not have permission to delete this comment.');
            } else {
                alert('Failed to delete comment.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while deleting the comment.');
        }
    };

    function createCommentElement(comment) {
        const el = document.createElement('div');
        el.className = 'comment-item';
        el.id = `comment-${comment.id}`;
        
        const isOwner = comment.athlete.id == currentAthleteId;
        const canDelete = isOwner || currentUserIsAdmin;
        const name = comment.athlete.name || 'Unknown User';
        const avatarUrl = comment.athlete.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);

        el.innerHTML = `
            <img src="${avatarUrl}" class="comment-avatar" alt="Avatar">
            <div class="comment-content">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="comment-author">${name}</span>
                    ${canDelete ? `<button style="background:none; border:none; color:#ef4444; font-size:11px; cursor:pointer;" data-action="delete-comment" data-comment-id="${comment.id}" data-post-id="${comment.post.id || comment.post}">Delete</button>` : ''}
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            </div>
        `;
        return el;
    }

    // --- Utils ---

    function formatTime(seconds) {
        if (!seconds) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
    }

    // --- Global Event Delegation ---
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;

        // Activity Picker Remove Activity
        if (target.matches('[data-action="remove-activity"]')) {
            window.removeAttachedActivity();
            return;
        }

        // Delete Post
        if (target.matches('[data-action="delete-post"]')) {
            const postId = target.getAttribute('data-post-id');
            if (postId) window.deletePost(postId);
            return;
        }

        // Toggle Like
        const likeBtn = target.closest('[data-action="toggle-like"]');
        if (likeBtn) {
            const postId = likeBtn.getAttribute('data-post-id');
            const liked = likeBtn.getAttribute('data-liked') === 'true';
            if (postId) window.toggleLike(postId, liked);
            return;
        }

        // Toggle Comments
        const commentBtn = target.closest('[data-action="toggle-comments"]');
        if (commentBtn) {
            const postId = commentBtn.getAttribute('data-post-id');
            if (postId) window.toggleComments(postId);
            return;
        }

        // Submit Comment
        if (target.matches('[data-action="submit-comment"]')) {
            const postId = target.getAttribute('data-post-id');
            if (postId) window.submitComment(postId);
            return;
        }

        // Delete Comment
        if (target.matches('[data-action="delete-comment"]')) {
            const commentId = target.getAttribute('data-comment-id');
            const postId = target.getAttribute('data-post-id');
            if (commentId && postId) window.deleteComment(commentId, postId);
            return;
        }
    });
});
