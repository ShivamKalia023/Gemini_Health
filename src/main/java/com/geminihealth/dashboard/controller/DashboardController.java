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

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/dashboard")
@Transactional
public class DashboardController {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ChallengeRepository challengeRepository;

    @Autowired
    private com.geminihealth.dashboard.service.PerformanceService performanceService;

    private LocalDateTime calculateStartDate(String timeFilter) {
        if (timeFilter == null || timeFilter.equalsIgnoreCase("all")) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        
        switch (timeFilter.toLowerCase()) {
            case "today":
                return LocalDateTime.of(today, LocalTime.MIN);
            case "week":
                return LocalDateTime.of(today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)), LocalTime.MIN);
            case "month":
                return LocalDateTime.of(today.withDayOfMonth(1), LocalTime.MIN);
            case "year":
                return LocalDateTime.of(today.withDayOfYear(1), LocalTime.MIN);
            default:
                return null;
        }
    }

    @GetMapping("/feed")
    public ResponseEntity<List<Activity>> getGlobalFeed(@RequestParam(required = false, defaultValue = "all") String timeFilter) {
        LocalDateTime startDate = calculateStartDate(timeFilter);
        if (startDate != null) {
            return ResponseEntity.ok(activityRepository.findTop50ByStartDateAfterOrderByStartDateDesc(startDate));
        }
        return ResponseEntity.ok(activityRepository.findTop50ByOrderByStartDateDesc());
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard(@RequestParam(required = false, defaultValue = "all") String timeFilter) {
        LocalDateTime startDate = calculateStartDate(timeFilter);
        List<AthleteProfile> athletes = athleteRepository.findAll();
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        for (AthleteProfile athlete : athletes) {
            List<Activity> activities;
            if (startDate != null) {
                activities = activityRepository.findByAthleteIdAndStartDateAfterOrderByStartDateDesc(athlete.getId(), startDate);
            } else {
                activities = activityRepository.findByAthleteIdOrderByStartDateDesc(athlete.getId());
            }
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

    
    @GetMapping("/champs")
    public ResponseEntity<List<Map<String, Object>>> getChamps() {
        List<AthleteProfile> athletes = athleteRepository.findAll();
        List<Activity> allActivities = activityRepository.findAll();
        
        // This week's start date
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        LocalDateTime thisWeekStart = LocalDateTime.of(now.toLocalDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)), LocalTime.MIN);

        AthleteProfile mostDistanceAthlete = null;
        double maxWeeklyDistance = 0;

        AthleteProfile mostActiveAthlete = null;
        int maxWeeklyActivities = 0;

        AthleteProfile cyclingChamp = null;
        double maxCyclingDistance = 0;

        AthleteProfile walkingChamp = null;
        double maxWalkingDistance = 0;

        AthleteProfile hikingChamp = null;
        double maxHikingDistance = 0;

        AthleteProfile longestRunAthlete = null;
        double maxRunDistance = 0;

        AthleteProfile longestRideAthlete = null;
        double maxRideDistance = 0;

        for (AthleteProfile athlete : athletes) {
            double weeklyDistance = 0;
            int weeklyActivities = 0;
            double cyclingDistance = 0;
            double walkingDistance = 0;
            double hikingDistance = 0;

            for (Activity act : allActivities) {
                if (act.getAthlete() != null && act.getAthlete().getId().equals(athlete.getId())) {
                    boolean isThisWeek = act.getStartDate() != null && act.getStartDate().isAfter(thisWeekStart);
                    String type = act.getType() != null ? act.getType().toLowerCase() : "";
                    double dist = act.getDistance() != null ? act.getDistance() : 0.0;

                    if (isThisWeek) {
                        weeklyActivities++;
                        weeklyDistance += dist;
                    }

                    if (type.contains("ride") || type.contains("biking") || type.contains("cycling")) {
                        cyclingDistance += dist;
                        if (dist > maxRideDistance) {
                            maxRideDistance = dist;
                            longestRideAthlete = athlete;
                        }
                    } else if (type.contains("walk")) {
                        walkingDistance += dist;
                    } else if (type.contains("hike")) {
                        hikingDistance += dist;
                    } else if (type.contains("run")) {
                        if (dist > maxRunDistance) {
                            maxRunDistance = dist;
                            longestRunAthlete = athlete;
                        }
                    }
                }
            }

            if (weeklyDistance > maxWeeklyDistance) {
                maxWeeklyDistance = weeklyDistance;
                mostDistanceAthlete = athlete;
            }
            if (weeklyActivities > maxWeeklyActivities) {
                maxWeeklyActivities = weeklyActivities;
                mostActiveAthlete = athlete;
            }
            if (cyclingDistance > maxCyclingDistance) {
                maxCyclingDistance = cyclingDistance;
                cyclingChamp = athlete;
            }
            if (walkingDistance > maxWalkingDistance) {
                maxWalkingDistance = walkingDistance;
                walkingChamp = athlete;
            }
            if (hikingDistance > maxHikingDistance) {
                maxHikingDistance = hikingDistance;
                hikingChamp = athlete;
            }
        }

        List<Map<String, Object>> champs = new ArrayList<>();

        if (mostDistanceAthlete != null && maxWeeklyDistance > 0) {
            champs.add(createChampEntry(mostDistanceAthlete, "Most Distance This Week", String.format("%.1f km", maxWeeklyDistance), "🏃", "🥇"));
        }
        if (mostActiveAthlete != null && maxWeeklyActivities > 0) {
            champs.add(createChampEntry(mostActiveAthlete, "Most Active Athlete", maxWeeklyActivities + " activities", "🔥", "🥇"));
        }
        if (cyclingChamp != null && maxCyclingDistance > 0) {
            champs.add(createChampEntry(cyclingChamp, "Cycling Champion", String.format("%.1f km", maxCyclingDistance), "🚴", "🏅"));
        }
        if (walkingChamp != null && maxWalkingDistance > 0) {
            champs.add(createChampEntry(walkingChamp, "Walking Champion", String.format("%.1f km", maxWalkingDistance), "🚶", "🏅"));
        }
        if (hikingChamp != null && maxHikingDistance > 0) {
            champs.add(createChampEntry(hikingChamp, "Hiking Champion", String.format("%.1f km", maxHikingDistance), "🥾", "🏅"));
        }
        if (longestRunAthlete != null && maxRunDistance > 0) {
            champs.add(createChampEntry(longestRunAthlete, "Longest Single Run", String.format("%.1f km", maxRunDistance), "🏃", "⭐"));
        }
        if (longestRideAthlete != null && maxRideDistance > 0) {
            champs.add(createChampEntry(longestRideAthlete, "Longest Ride", String.format("%.1f km", maxRideDistance), "🚴", "⭐"));
        }

        return ResponseEntity.ok(champs);
    }

    private Map<String, Object> createChampEntry(AthleteProfile athlete, String title, String metric, String icon, String badge) {
        Map<String, Object> map = new HashMap<>();
        map.put("athlete", athlete);
        map.put("title", title);
        map.put("metric", metric);
        map.put("icon", icon);
        map.put("badge", badge);
        return map;
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

