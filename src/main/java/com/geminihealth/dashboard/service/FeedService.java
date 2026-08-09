package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.Post;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.PostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Optional;

@Service
@Transactional
public class FeedService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ImageStorageService imageStorageService;

    public Post createPost(AthleteProfile athlete, String caption, String activityIdStr, MultipartFile image) throws IOException {
        Post post = new Post();
        post.setAthlete(athlete);
        post.setCaption(caption);

        if (activityIdStr != null && !activityIdStr.trim().isEmpty() && !activityIdStr.equals("null")) {
            try {
                Long activityId = Long.parseLong(activityIdStr);
                Optional<Activity> activityOpt = activityRepository.findById(activityId);
                if (activityOpt.isPresent() && activityOpt.get().getAthlete().getId().equals(athlete.getId())) {
                    post.setActivity(activityOpt.get());
                }
            } catch (NumberFormatException e) {
                // Invalid activity ID format
            }
        }

        if (image != null && !image.isEmpty()) {
            String imagePath = imageStorageService.storeImage(image);
            post.setImagePath(imagePath);
        }

        return postRepository.save(post);
    }

    public void deletePost(Post post) {
        if (post.getImagePath() != null) {
            imageStorageService.deleteImage(post.getImagePath());
        }
        postRepository.delete(post);
    }
}
