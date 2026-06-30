package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.Challenge;
import com.geminihealth.dashboard.repository.ChallengeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/challenges")
@CrossOrigin(origins = "*")
public class ChallengeController {

    @Autowired
    private ChallengeRepository challengeRepository;

    @PostMapping
    public ResponseEntity<?> addChallenge(@RequestBody Challenge challenge, @CookieValue(value = "admin_token", required = false) String adminToken) {
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }
        
        if (challenge.getTitle() == null || challenge.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Challenge title is required."));
        }
        
        Challenge saved = challengeRepository.save(challenge);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteChallenge(@PathVariable Long id, @CookieValue(value = "admin_token", required = false) String adminToken) {
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }
        
        if (challengeRepository.existsById(id)) {
            challengeRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}
