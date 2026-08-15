package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.ManualActivitySubmission;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.ManualActivitySubmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ManualActivitySubmissionService {

    @Autowired
    private ManualActivitySubmissionRepository submissionRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private PerformanceService performanceService;
    
    @Autowired
    private LogCaptureService log;

    @Transactional
    public ManualActivitySubmission submitActivity(ManualActivitySubmission submission, AthleteProfile athlete) {
        // Validate
        if (submission.getName() == null || submission.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Activity name is required.");
        }
        if (submission.getType() == null || submission.getType().trim().isEmpty()) {
            throw new IllegalArgumentException("Activity type is required.");
        }
        if (submission.getStartDate() == null) {
            throw new IllegalArgumentException("Start date is required.");
        }
        if (submission.getDistance() == null || submission.getDistance() < 0) {
            throw new IllegalArgumentException("Distance must be a positive number.");
        }
        if (submission.getElapsedTime() == null || submission.getElapsedTime() < 0) {
            throw new IllegalArgumentException("Elapsed time must be a positive number.");
        }
        if (submission.getMovingTime() != null) {
            if (submission.getMovingTime() < 0) {
                throw new IllegalArgumentException("Moving time cannot be negative.");
            }
            if (submission.getMovingTime() > submission.getElapsedTime()) {
                throw new IllegalArgumentException("Moving time cannot exceed elapsed time.");
            }
        }
        if (submission.getAverageHr() != null && submission.getAverageHr() < 0) {
            throw new IllegalArgumentException("Average heart rate cannot be negative.");
        }
        if (submission.getAverageSpeed() != null && submission.getAverageSpeed() < 0) {
            throw new IllegalArgumentException("Average speed cannot be negative.");
        }
        if (submission.getAverageWatts() != null && submission.getAverageWatts() < 0) {
            throw new IllegalArgumentException("Average watts cannot be negative.");
        }
        if (submission.getTotalElevationGain() != null && submission.getTotalElevationGain() < 0) {
            throw new IllegalArgumentException("Elevation gain cannot be negative.");
        }

        submission.setAthlete(athlete);
        submission.setStatus(ManualActivitySubmission.Status.PENDING);
        
        ManualActivitySubmission saved = submissionRepository.save(submission);
        log.info("Activity submission created by athlete " + athlete.getId() + " (Submission ID: " + saved.getId() + ")");
        return saved;
    }

    public List<ManualActivitySubmission> getSubmissionsByAthlete(Long athleteId) {
        return submissionRepository.findByAthleteIdOrderBySubmittedAtDesc(athleteId);
    }

    public List<ManualActivitySubmission> getPendingSubmissions() {
        return submissionRepository.findByStatusOrderBySubmittedAtDesc(ManualActivitySubmission.Status.PENDING);
    }

    @Transactional
    public void approveSubmission(Long submissionId, String adminId) {
        ManualActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (submission.getStatus() != ManualActivitySubmission.Status.PENDING) {
            throw new IllegalStateException("Only pending submissions can be approved.");
        }

        Activity activity = new Activity();
        activity.setAthlete(submission.getAthlete());
        activity.setName(submission.getName());
        activity.setType(submission.getType());
        activity.setStartDate(submission.getStartDate());
        activity.setDistance(submission.getDistance());
        activity.setElapsedTime(submission.getElapsedTime());
        activity.setMovingTime(submission.getMovingTime() != null ? submission.getMovingTime() : submission.getElapsedTime());
        activity.setAverageHr(submission.getAverageHr());
        activity.setMaxHr(submission.getMaxHr());
        activity.setAverageSpeed(submission.getAverageSpeed());
        activity.setAverageWatts(submission.getAverageWatts());
        activity.setTotalElevationGain(submission.getTotalElevationGain());
        activity.setStravaActivityId(null);
        activity.setStreamJson(null);
        
        // Calculate TRIMP
        int trimp = performanceService.calculateTrimp(activity, submission.getAthlete());
        activity.setTrimp(trimp);

        activityRepository.save(activity);

        submission.setStatus(ManualActivitySubmission.Status.APPROVED);
        submission.setReviewedAt(LocalDateTime.now());
        submission.setReviewedBy(adminId);
        
        submissionRepository.save(submission);
        log.info("Activity submission " + submissionId + " approved by admin " + adminId);
    }

    @Transactional
    public void rejectSubmission(Long submissionId, String adminId, String reason) {
        ManualActivitySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (submission.getStatus() != ManualActivitySubmission.Status.PENDING) {
            throw new IllegalStateException("Only pending submissions can be rejected.");
        }

        submission.setStatus(ManualActivitySubmission.Status.REJECTED);
        submission.setRejectionReason(reason);
        submission.setReviewedAt(LocalDateTime.now());
        submission.setReviewedBy(adminId);
        
        submissionRepository.save(submission);
        log.info("Activity submission " + submissionId + " rejected by admin " + adminId);
    }
}
