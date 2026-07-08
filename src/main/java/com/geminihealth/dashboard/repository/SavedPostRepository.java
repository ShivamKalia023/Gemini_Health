package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.SavedPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {
    List<SavedPost> findByAthleteIdOrderByCreatedAtDesc(Long athleteId);
    boolean existsByPostIdAndAthleteId(Long postId, Long athleteId);
    Optional<SavedPost> findByPostIdAndAthleteId(Long postId, Long athleteId);
    void deleteByPostId(Long postId);
}
