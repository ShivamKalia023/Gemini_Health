package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AthleteRepository athleteRepository;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        if (athleteIdCookie == null || athleteIdCookie.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            Long id = Long.parseLong(athleteIdCookie);
            return athleteRepository.findById(id)
                    .map(athlete -> ResponseEntity.ok(Map.of(
                            "status", athlete.getStatus().name(),
                            "role", athlete.getRole().name()
                    )))
                    .orElse(ResponseEntity.status(404).body(Map.of("error", "Athlete not found")));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid ID"));
        }
    }
}
