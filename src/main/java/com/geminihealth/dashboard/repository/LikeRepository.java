package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.LikeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LikeRepository extends JpaRepository<LikeRecord, Long> {
    int countByPostId(Long postId);
    boolean existsByPostIdAndAthleteId(Long postId, Long athleteId);
    Optional<LikeRecord> findByPostIdAndAthleteId(Long postId, Long athleteId);
    void deleteByPostId(Long postId);
}
