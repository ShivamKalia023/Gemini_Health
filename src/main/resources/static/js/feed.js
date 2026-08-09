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

    // Image Upload Elements
    const addImageBtn = document.getElementById('add-image-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-upload-preview-container');
    const imagePreview = document.getElementById('image-upload-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    
    // Image Viewer Modal
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const fullSizeImage = document.getElementById('full-size-image');
    const closeImageViewerBtn = document.getElementById('close-image-viewer');
    
    let selectedImageFile = null;

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
        if (!caption && !selectedActivityId && !selectedImageFile) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            const formData = new FormData();
            formData.append('caption', caption);
            if (selectedActivityId) {
                formData.append('activityId', selectedActivityId);
            }
            if (selectedImageFile) {
                formData.append('image', selectedImageFile);
            }

            const response = await fetch('/api/feed', {
                method: 'POST',
                // FormData automatically sets the Content-Type header with the boundary
                body: formData
            });

            if (response.ok) {
                const newPost = await response.json();
                captionInput.value = '';
                selectedActivityId = null;
                selectedActivityPreview.style.display = 'none';
                selectedActivityPreview.innerHTML = '';
                openPickerBtn.innerHTML = '<span style="font-size: 16px;">+</span> Attach Activity';
                openPickerBtn.classList.remove('selected');
                
                selectedImageFile = null;
                imagePreviewContainer.style.display = 'none';
                imagePreview.src = '';
                imageUploadInput.value = '';
                
                // Prepend new post
                const postElement = createPostElement(newPost);
                postsContainer.insertBefore(postElement, postsContainer.firstChild);
            } else {
                const errorText = await response.text();
                alert(errorText || 'Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Error creating post');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    });

    // --- Image Upload Logic ---
    if (addImageBtn) {
        addImageBtn.addEventListener('click', () => {
            imageUploadInput.click();
        });
    }

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Client-side validation
            if (file.size > 5 * 1024 * 1024) {
                alert('Image exceeds the maximum allowed size of 5MB.');
                imageUploadInput.value = '';
                return;
            }

            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Unsupported image format. Allowed formats: JPG, PNG, WEBP.');
                imageUploadInput.value = '';
                return;
            }

            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            selectedImageFile = null;
            imageUploadInput.value = '';
            imagePreviewContainer.style.display = 'none';
            imagePreview.src = '';
        });
    }

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
        const imageHtml = post.imagePath ? `<div class="post-image-container" style="margin-top: 12px; border-radius: 8px; overflow: hidden; background: #f1f5f9;"><img src="${post.imagePath}" alt="Post image" style="width: 100%; max-height: 400px; object-fit: cover; cursor: pointer; transition: transform 0.2s;" class="feed-post-image" loading="lazy" onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:#94a3b8;font-size:14px;\\'>Image unavailable</div>'"></div>` : '';
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
            ${imageHtml}
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
                            list.appendChild(createCommentElement(c, postId));
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
                list.appendChild(createCommentElement(comment, postId));
                
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

    function createCommentElement(comment, postId) {
        const el = document.createElement('div');
        el.className = 'comment-item';
        el.id = `comment-${comment.id}`;
        
        const isOwner = comment.athlete && comment.athlete.id == currentAthleteId;
        const canDelete = isOwner || currentUserIsAdmin;
        const name = comment.athlete ? comment.athlete.name : 'Unknown User';
        const avatarUrl = comment.athlete && comment.athlete.avatarUrl ? comment.athlete.avatarUrl : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);

        el.innerHTML = `
            <img src="${avatarUrl}" class="comment-avatar" alt="Avatar">
            <div class="comment-content">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="comment-author">${name}</span>
                    ${canDelete ? `<button style="background:none; border:none; color:#ef4444; font-size:11px; cursor:pointer;" data-action="delete-comment" data-comment-id="${comment.id}" data-post-id="${postId}">Delete</button>` : ''}
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

        // Image Viewer
        if (target.matches('.feed-post-image')) {
            fullSizeImage.src = target.src;
            imageViewerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            return;
        }

        // Close Image Viewer if clicked outside image or on close button
        if (target.matches('.modal-overlay') || target.matches('#close-image-viewer')) {
            if (imageViewerModal.style.display === 'flex') {
                imageViewerModal.style.display = 'none';
                fullSizeImage.src = '';
                document.body.style.overflow = '';
            }
        }
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (imageViewerModal && imageViewerModal.style.display === 'flex') {
                imageViewerModal.style.display = 'none';
                fullSizeImage.src = '';
                document.body.style.overflow = '';
            }
        }
    });
});
