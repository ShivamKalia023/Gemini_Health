package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.Challenge;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.repository.ChallengeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ChallengeRepository challengeRepository;

    @Autowired
    private com.geminihealth.dashboard.service.PerformanceService performanceService;

    @GetMapping("/feed")
    public ResponseEntity<List<Activity>> getGlobalFeed() {
        return ResponseEntity.ok(activityRepository.findTop50ByOrderByStartDateDesc());
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        List<AthleteProfile> athletes = athleteRepository.findAll();
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        for (AthleteProfile athlete : athletes) {
            List<Activity> activities = activityRepository.findByAthleteIdOrderByStartDateDesc(athlete.getId());
            Activity lastRun = null;
            
            for (Activity act : activities) {
                if (act.getType() != null && act.getType().toLowerCase().contains("run")) {
                    lastRun = act;
                    break;
                }
            }

            Map<String, Object> entry = new HashMap<>();
            entry.put("athlete", athlete);
            entry.put("totalActivities", activities.size());
            if (lastRun != null) {
                entry.put("lastRunDistance", lastRun.getDistance());
                entry.put("lastRunDate", lastRun.getStartDate());
            } else {
                entry.put("lastRunDistance", 0.0);
            }
            leaderboard.add(entry);
        }

        // Sort descending by lastRunDistance
        leaderboard.sort((a, b) -> Double.compare(
                (Double) b.get("lastRunDistance"),
                (Double) a.get("lastRunDistance")
        ));

        return ResponseEntity.ok(leaderboard);
    }

    @GetMapping("/challenges")
    public ResponseEntity<List<Challenge>> getChallenges() {
        return ResponseEntity.ok(challengeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/activities/{id}")
    public ResponseEntity<Map<String, Object>> getActivityById(@PathVariable Long id) {
        java.util.Optional<Activity> activityOpt = activityRepository.findById(id);
        if (activityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Activity activity = activityOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("activity", activity);

        try {
            AthleteProfile athlete = activity.getAthlete();
            List<com.geminihealth.dashboard.service.PerformanceService.DailyMetrics> timeline = 
                    performanceService.getPerformanceTimeline(athlete);

            java.time.LocalDate activityDate = activity.getStartDate().toLocalDate();
            java.util.Optional<com.geminihealth.dashboard.service.PerformanceService.DailyMetrics> metricsOnDay = timeline.stream()
                    .filter(m -> m.date.equals(activityDate))
                    .findFirst();

            if (metricsOnDay.isPresent()) {
                response.put("ctl", metricsOnDay.get().fitness);
                response.put("atl", metricsOnDay.get().fatigue);
                response.put("tsb", metricsOnDay.get().form);
                response.put("trainingStatus", metricsOnDay.get().status);
            } else {
                response.put("ctl", null);
                response.put("atl", null);
                response.put("tsb", null);
                response.put("trainingStatus", null);
            }
        } catch (Exception e) {
            // Ignore error and fall back
        }

        return ResponseEntity.ok(response);
    }
}
