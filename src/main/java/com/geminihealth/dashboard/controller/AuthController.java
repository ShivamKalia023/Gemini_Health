package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
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

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@CookieValue(value = "athlete_id", required = false) String athleteIdCookie) {
        if (athleteIdCookie == null || athleteIdCookie.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            Long id = Long.parseLong(athleteIdCookie);
            return athleteRepository.findById(id)
                    .map(athlete -> ResponseEntity.ok(Map.of(
                            "id", athlete.getId(),
                            "name", athlete.getName(),
                            "role", athlete.getRole().name(),
                            "avatarUrl", athlete.getAvatarUrl() != null ? athlete.getAvatarUrl() : ""
                    )))
                    .orElse(ResponseEntity.status(404).body(Map.of("error", "Athlete not found")));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid ID"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie authCookie = new Cookie("athlete_id", null);
        authCookie.setPath("/");
        authCookie.setMaxAge(0);
        authCookie.setHttpOnly(true);
        response.addCookie(authCookie);

        Cookie adminCookie = new Cookie("admin_token", null);
        adminCookie.setPath("/");
        adminCookie.setMaxAge(0);
        adminCookie.setHttpOnly(true);
        response.addCookie(adminCookie);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
