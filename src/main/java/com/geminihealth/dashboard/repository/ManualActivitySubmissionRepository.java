package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.ManualActivitySubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManualActivitySubmissionRepository extends JpaRepository<ManualActivitySubmission, Long> {
    
    List<ManualActivitySubmission> findByAthleteIdOrderBySubmittedAtDesc(Long athleteId);
    
    List<ManualActivitySubmission> findByStatusOrderBySubmittedAtDesc(ManualActivitySubmission.Status status);
}
