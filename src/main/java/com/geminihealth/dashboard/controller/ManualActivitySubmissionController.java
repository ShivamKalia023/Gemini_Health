package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.ManualActivitySubmission;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.service.ManualActivitySubmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ManualActivitySubmissionController {

    @Autowired
    private ManualActivitySubmissionService submissionService;

    @Autowired
    private AthleteRepository athleteRepository;

    // --- USER ENDPOINTS ---

    @PostMapping("/activity-submissions")
    public ResponseEntity<?> createSubmission(
            @RequestBody ManualActivitySubmission submission,
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        if (athleteIdCookie == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        try {
            Long athleteId = Long.parseLong(athleteIdCookie);
            Optional<AthleteProfile> athleteOpt = athleteRepository.findById(athleteId);
            if (athleteOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Athlete not found"));
            }

            ManualActivitySubmission saved = submissionService.submitActivity(submission, athleteOpt.get());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/activity-submissions/me")
    public ResponseEntity<?> getMySubmissions(
            @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        
        if (athleteIdCookie == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        try {
            Long athleteId = Long.parseLong(athleteIdCookie);
            List<ManualActivitySubmission> submissions = submissionService.getSubmissionsByAthlete(athleteId);
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    // --- ADMIN ENDPOINTS ---

    @GetMapping("/admin/activity-submissions/pending")
    public ResponseEntity<?> getPendingSubmissions(
            @CookieValue(value = "admin_token", required = false) String adminToken) {
        
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
        }

        try {
            List<ManualActivitySubmission> submissions = submissionService.getPendingSubmissions();
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/admin/activity-submissions/{id}/approve")
    public ResponseEntity<?> approveSubmission(
            @PathVariable Long id,
            @CookieValue(value = "admin_token", required = false) String adminToken,
            @CookieValue(value = "athlete_id", required = false) String adminAthleteId) {
        
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
        }

        try {
            String reviewerId = adminAthleteId != null ? adminAthleteId : "admin";
            submissionService.approveSubmission(id, reviewerId);
            return ResponseEntity.ok(Map.of("message", "Activity submitted successfully and is awaiting admin approval.")); // Returning success message
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/admin/activity-submissions/{id}/reject")
    public ResponseEntity<?> rejectSubmission(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload,
            @CookieValue(value = "admin_token", required = false) String adminToken,
            @CookieValue(value = "athlete_id", required = false) String adminAthleteId) {
        
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
        }

        try {
            String reason = payload != null ? payload.get("reason") : null;
            String reviewerId = adminAthleteId != null ? adminAthleteId : "admin";
            submissionService.rejectSubmission(id, reviewerId, reason);
            return ResponseEntity.ok(Map.of("message", "Activity submission rejected successfully."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
