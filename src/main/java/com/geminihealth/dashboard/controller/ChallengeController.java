package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.Challenge;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.repository.ChallengeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/challenges")
@CrossOrigin(origins = "*")
@Transactional
public class ChallengeController {

    @Autowired
    private ChallengeRepository challengeRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @GetMapping
    public ResponseEntity<?> getAllChallenges() {
        List<Challenge> challenges = challengeRepository.findAll();
        return ResponseEntity.ok(challenges);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getChallengeById(@PathVariable Long id) {
        Optional<Challenge> challenge = challengeRepository.findById(id);
        if (challenge.isPresent()) {
            return ResponseEntity.ok(challenge.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> addChallenge(@RequestBody Challenge challenge) {
        if (challenge.getTitle() == null || challenge.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Challenge title is required."));
        }
        
        ResponseEntity<?> dateValidationError = validateChallengeDates(challenge);
        if (dateValidationError != null) {
            return dateValidationError;
        }
        
        Challenge saved = challengeRepository.save(challenge);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateChallenge(@PathVariable Long id, @RequestBody Challenge challengeDetails) {
        Optional<Challenge> existing = challengeRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Challenge challenge = existing.get();
        if (challengeDetails.getTitle() != null) challenge.setTitle(challengeDetails.getTitle());
        if (challengeDetails.getDescription() != null) challenge.setDescription(challengeDetails.getDescription());
        if (challengeDetails.getActivityType() != null) challenge.setActivityType(challengeDetails.getActivityType());
        if (challengeDetails.getGoalType() != null) challenge.setGoalType(challengeDetails.getGoalType());
        if (challengeDetails.getTargetValue() != null) challenge.setTargetValue(challengeDetails.getTargetValue());
        if (challengeDetails.getUnit() != null) challenge.setUnit(challengeDetails.getUnit());
        if (challengeDetails.getStartDate() != null) challenge.setStartDate(challengeDetails.getStartDate());
        if (challengeDetails.getEndDate() != null) challenge.setEndDate(challengeDetails.getEndDate());
        if (challengeDetails.getStatus() != null) challenge.setStatus(challengeDetails.getStatus());
        if (challengeDetails.getBannerImage() != null) challenge.setBannerImage(challengeDetails.getBannerImage());
        if (challengeDetails.getIsPublic() != null) challenge.setIsPublic(challengeDetails.getIsPublic());

        if (challengeDetails.getRegistrationStartDate() != null) challenge.setRegistrationStartDate(challengeDetails.getRegistrationStartDate());
        if (challengeDetails.getRegistrationEndDate() != null) challenge.setRegistrationEndDate(challengeDetails.getRegistrationEndDate());

        ResponseEntity<?> dateValidationError = validateChallengeDates(challenge);
        if (dateValidationError != null) {
            return dateValidationError;
        }

        Challenge updated = challengeRepository.save(challenge);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateChallengeStatus(@PathVariable Long id, @RequestBody Map<String, String> statusUpdate) {
        String status = statusUpdate.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        Optional<Challenge> existing = challengeRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Challenge challenge = existing.get();
        challenge.setStatus(status);
        challengeRepository.save(challenge);

        return ResponseEntity.ok(challenge);
    }

    private ResponseEntity<?> validateChallengeDates(Challenge challenge) {
        LocalDateTime rStart = challenge.getRegistrationStartDate();
        LocalDateTime rEnd = challenge.getRegistrationEndDate();
        LocalDateTime cStart = challenge.getStartDate();
        LocalDateTime cEnd = challenge.getEndDate();

        if (rStart != null && rEnd != null && !rStart.isBefore(rEnd)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Registration Start Date must be before Registration End Date."));
        }
        if (rEnd != null && cStart != null && rEnd.isAfter(cStart)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Registration End Date must be on or before Challenge Start Date."));
        }
        if (cStart != null && cEnd != null && !cStart.isBefore(cEnd)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Challenge Start Date must be before Challenge End Date."));
        }
        return null; // No errors
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteChallenge(@PathVariable Long id) {
        if (challengeRepository.existsById(id)) {
            challengeRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted"));
        }
        return ResponseEntity.notFound().build();
    }

    // Participation Endpoints
    @PostMapping("/{id}/participate")
    public ResponseEntity<?> participateInChallenge(@PathVariable Long id, @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        if (athleteIdCookie == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not logged in."));
        }

        Long athleteId;
        try {
            athleteId = Long.valueOf(athleteIdCookie);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid user ID."));
        }

        Optional<Challenge> challengeOpt = challengeRepository.findById(id);
        if (challengeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<AthleteProfile> athleteOpt = athleteRepository.findById(athleteId);
        if (athleteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found."));
        }

        Challenge challenge = challengeOpt.get();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rStart = challenge.getRegistrationStartDate();
        LocalDateTime rEnd = challenge.getRegistrationEndDate();
        
        if (rStart == null || rEnd == null) {
            // Fallback for legacy challenges without registration dates, but still shouldn't join if not active or beyond end
            if (!"Active".equalsIgnoreCase(challenge.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot join a challenge that is not active."));
            }
        } else {
            if (now.isBefore(rStart)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Registration has not opened yet."));
            }
            if (now.isAfter(rEnd)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Registration is closed."));
            }
        }

        challenge.addParticipant(athleteOpt.get());
        challengeRepository.save(challenge);

        return ResponseEntity.ok(Map.of("message", "Successfully joined the challenge", "participantCount", challenge.getParticipantCount()));
    }

    @DeleteMapping("/{id}/participate")
    public ResponseEntity<?> leaveChallenge(@PathVariable Long id, @CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        if (athleteIdCookie == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not logged in."));
        }

        Long athleteId;
        try {
            athleteId = Long.valueOf(athleteIdCookie);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid user ID."));
        }

        Optional<Challenge> challengeOpt = challengeRepository.findById(id);
        if (challengeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<AthleteProfile> athleteOpt = athleteRepository.findById(athleteId);
        if (athleteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found."));
        }

        Challenge challenge = challengeOpt.get();
        if ("Completed".equalsIgnoreCase(challenge.getStatus())) {
             return ResponseEntity.badRequest().body(Map.of("error", "Cannot leave an ended challenge."));
        }

        challenge.removeParticipant(athleteOpt.get());
        challengeRepository.save(challenge);

        return ResponseEntity.ok(Map.of("message", "Successfully left the challenge", "participantCount", challenge.getParticipantCount()));
    }
}
