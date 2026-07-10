package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.*;
import com.geminihealth.dashboard.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/feed")
@Transactional
public class FeedController {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private SavedPostRepository savedPostRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    private AthleteProfile getAuthenticatedAthlete(String athleteIdCookie) {
        if (athleteIdCookie == null || athleteIdCookie.isEmpty()) {
            return null;
        }
        try {
            Long athleteId = Long.parseLong(athleteIdCookie);
            return athleteRepository.findById(athleteId).orElse(null);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void populatePostMetadata(Post post, AthleteProfile currentAthlete) {
        post.setLikeCount(likeRepository.countByPostId(post.getId()));
        post.setCommentCount(commentRepository.countByPostId(post.getId()));
        if (currentAthlete != null) {
            post.setLikedByCurrentUser(likeRepository.existsByPostIdAndAthleteId(post.getId(), currentAthlete.getId()));
        } else {
            post.setLikedByCurrentUser(false);
        }
    }

    @GetMapping
    public ResponseEntity<Page<Post>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile currentAthlete = getAuthenticatedAthlete(athleteIdCookie);
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findAllByOrderByCreatedAtDesc(pageable);
        
        posts.forEach(post -> populatePostMetadata(post, currentAthlete));
        
        return ResponseEntity.ok(posts);
    }

    @PostMapping
    public ResponseEntity<?> createPost(
            @RequestBody Map<String, Object> payload,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }

        Post post = new Post();
        post.setAthlete(athlete);
        post.setCaption((String) payload.get("caption"));

        if (payload.containsKey("activityId") && payload.get("activityId") != null) {
            try {
                Long activityId = Long.parseLong(payload.get("activityId").toString());
                Optional<Activity> activityOpt = activityRepository.findById(activityId);
                if (activityOpt.isPresent() && activityOpt.get().getAthlete().getId().equals(athlete.getId())) {
                    post.setActivity(activityOpt.get());
                }
            } catch (NumberFormatException e) {
                // Invalid activity ID format
            }
        }

        Post savedPost = postRepository.save(post);
        populatePostMetadata(savedPost, athlete);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPost);
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(
            @PathVariable Long postId,
            @CookieValue(value = "admin_token", required = false) String adminToken,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Post> postOpt = postRepository.findById(postId);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Post post = postOpt.get();
        boolean isAdmin = "true".equals(adminToken) || athlete.getRole() == AthleteProfile.Role.ADMIN;
        boolean isOwner = post.getAthlete().getId().equals(athlete.getId());
        
        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed to delete this post");
        }

        // Clean up dependencies
        commentRepository.deleteByPostId(postId);
        likeRepository.deleteByPostId(postId);
        savedPostRepository.deleteByPostId(postId);

        postRepository.delete(post);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<?> likePost(
            @PathVariable Long postId,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Post> postOpt = postRepository.findById(postId);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (!likeRepository.existsByPostIdAndAthleteId(postId, athlete.getId())) {
            LikeRecord like = new LikeRecord(postOpt.get(), athlete);
            likeRepository.save(like);
        }

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<?> unlikePost(
            @PathVariable Long postId,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<LikeRecord> likeOpt = likeRepository.findByPostIdAndAthleteId(postId, athlete.getId());
        likeOpt.ifPresent(likeRepository::delete);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long postId,
            @RequestBody Map<String, String> payload,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Post> postOpt = postRepository.findById(postId);
        if (postOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String content = payload.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Comment content cannot be empty");
        }

        Comment comment = new Comment();
        comment.setPost(postOpt.get());
        comment.setAthlete(athlete);
        comment.setContent(content.trim());

        Comment savedComment = commentRepository.save(comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedComment);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @CookieValue(value = "admin_token", required = false) String adminToken,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile athlete = getAuthenticatedAthlete(athleteIdCookie);
        if (athlete == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Comment comment = commentOpt.get();
        boolean isAdmin = "true".equals(adminToken) || athlete.getRole() == AthleteProfile.Role.ADMIN;
        boolean isOwner = comment.getAthlete().getId().equals(athlete.getId());

        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed to delete this comment");
        }

        commentRepository.delete(commentOpt.get());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/{athleteId}")
    public ResponseEntity<List<Post>> getUserPosts(
            @PathVariable Long athleteId,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        AthleteProfile currentAthlete = getAuthenticatedAthlete(athleteIdCookie);
        List<Post> posts = postRepository.findByAthleteIdOrderByCreatedAtDesc(athleteId);
        posts.forEach(post -> populatePostMetadata(post, currentAthlete));
        
        return ResponseEntity.ok(posts);
    }
}
