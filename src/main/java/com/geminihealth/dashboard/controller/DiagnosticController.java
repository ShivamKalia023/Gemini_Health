package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/diagnostic")
@CrossOrigin(origins = "*")
public class DiagnosticController {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDatabaseStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            long athleteCount = athleteRepository.count();
            long activityCount = activityRepository.count();
            
            stats.put("athletesCount", athleteCount);
            stats.put("activitiesCount", activityCount);
            stats.put("status", "Database accessible");
            stats.put("success", true);
        } catch (Exception e) {
            stats.put("status", "Database error: " + e.getMessage());
            stats.put("success", false);
        }
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/athlete/{id}/activities/count")
    public ResponseEntity<Map<String, Object>> getAthletActivitiesCount(@PathVariable Long id) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            var activities = activityRepository.findByAthleteIdOrderByStartDateDesc(id);
            result.put("athleteId", id);
            result.put("activitiesCount", activities.size());
            result.put("activities", activities);
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return ResponseEntity.ok(result);
    }
}

