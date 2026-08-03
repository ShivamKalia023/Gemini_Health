package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.service.AIService;
import com.geminihealth.dashboard.service.RateLimitingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIService aiService;
    private final RateLimitingService rateLimitingService;

    public AIController(AIService aiService, RateLimitingService rateLimitingService) {
        this.aiService = aiService;
        this.rateLimitingService = rateLimitingService;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@CookieValue(value = "athlete_id", required = false) String athleteIdCookie, 
                                  @RequestBody Map<String, String> request) {
        if (athleteIdCookie == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Long athleteId;
        try {
            athleteId = Long.valueOf(athleteIdCookie);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid user token"));
        }

        if (!rateLimitingService.tryConsume(athleteId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Rate limit exceeded (20 requests per hour)."));
        }

        String userMessage = request.get("message");
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is required"));
        }

        try {
            String response = aiService.generateResponse(athleteId, userMessage);
            return ResponseEntity.ok(Map.of("response", response));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI Health Assistant is temporarily unavailable. Please try again later."));
        }
    }
}
