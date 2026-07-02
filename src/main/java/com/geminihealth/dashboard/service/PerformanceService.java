package com.geminihealth.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class PerformanceService {

    @Autowired
    private ActivityRepository activityRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Calculates the Training Impulse (TRIMP) stress score for an activity.
     */
    public int calculateTrimp(Activity activity, AthleteProfile athlete) {
        double durationMinutes = activity.getMovingTime() / 60.0;
        
        // Default resting and max heart rate if not set
        int restingHr = athlete.getRestingHr() != null ? athlete.getRestingHr() : 60;
        int maxHr = athlete.getMaxHr() != null ? athlete.getMaxHr() : 190;
        
        if (activity.getAverageHr() != null && activity.getAverageHr() > restingHr) {
            // Heart Rate Intensity (0.0 to 1.0)
            double hrIntensity = (double) (activity.getAverageHr() - restingHr) / (maxHr - restingHr);
            hrIntensity = Math.min(Math.max(hrIntensity, 0.0), 1.0); // Clamp between 0 and 1
            
            // Banister's TRIMP formula: duration * s * 0.64 * e^(1.92 * s)
            double factor = 0.64 * Math.exp(1.92 * hrIntensity);
            return (int) Math.round(durationMinutes * hrIntensity * factor);
        } else {
            // Fallback estimation when Heart Rate is missing, based on activity type
            double multiplier = 0.7; // default
            String type = activity.getType() != null ? activity.getType().toLowerCase() : "run";
            if (type.contains("run")) {
                multiplier = 1.2; // Running is high stress
            } else if (type.contains("ride") || type.contains("cycl")) {
                multiplier = 0.8; // Cycling is moderate stress
            } else if (type.contains("swim")) {
                multiplier = 0.9;
            } else if (type.contains("strength") || type.contains("weight") || type.contains("gym")) {
                multiplier = 0.5; // Strength is lower cardiovascular stress
            }
            return (int) Math.round(durationMinutes * multiplier);
        }
    }

    /**
     * Class to hold daily performance metrics.
     */
    public static class DailyMetrics {
        public LocalDate date;
        public double trimp;
        public double fitness; // CTL
        public double fatigue; // ATL
        public double form;    // TSB
        public String status;  // Fresh, Optimal, Overreaching, Detraining

        // Aggregated fields for daily activities
        public int activityCount;
        public double totalDistance; // km
        public double totalMovingTime; // seconds
        public double totalElevationGain; // meters

        public DailyMetrics(LocalDate date, double trimp, double fitness, double fatigue, double form, String status) {
            this.date = date;
            this.trimp = trimp;
            this.fitness = Math.round(fitness * 10.0) / 10.0;
            this.fatigue = Math.round(fatigue * 10.0) / 10.0;
            this.form = Math.round(form * 10.0) / 10.0;
            this.status = status;
        }
    }

    /**
     * Computes the training load metrics for an athlete over a default 90-day window.
     */
    public List<DailyMetrics> getPerformanceTimeline(AthleteProfile athlete) {
        return getPerformanceTimeline(athlete, LocalDate.now().minusDays(90), LocalDate.now());
    }

    /**
     * Computes the training load metrics for an athlete over a custom date range.
     * Computes background warm-up buffers (120 days prior) to ensure CTL/ATL are accurate.
     */
    public List<DailyMetrics> getPerformanceTimeline(AthleteProfile athlete, LocalDate requestStartDate, LocalDate requestEndDate) {
        if (requestEndDate == null) {
            requestEndDate = LocalDate.now();
        }
        if (requestStartDate == null) {
            requestStartDate = requestEndDate.minusDays(6);
        }

        List<Activity> activities = activityRepository.findByAthleteIdOrderByStartDateDesc(athlete.getId());
        
        // Setup date range: 120 days ago to requestEndDate to calculate CTL/ATL accurately
        LocalDate calculationStartDate = requestStartDate.minusDays(120);
        
        // Map to store daily TRIMP sum and aggregated metrics
        Map<LocalDate, Double> dailyTrimp = new HashMap<>();
        Map<LocalDate, Integer> dailyCount = new HashMap<>();
        Map<LocalDate, Double> dailyDistance = new HashMap<>();
        Map<LocalDate, Double> dailyMovingTime = new HashMap<>();
        Map<LocalDate, Double> dailyElevation = new HashMap<>();

        LocalDate cur = calculationStartDate;
        while (!cur.isAfter(requestEndDate)) {
            dailyTrimp.put(cur, 0.0);
            dailyCount.put(cur, 0);
            dailyDistance.put(cur, 0.0);
            dailyMovingTime.put(cur, 0.0);
            dailyElevation.put(cur, 0.0);
            cur = cur.plusDays(1);
        }

        // Aggregate activity stats into daily buckets
        for (Activity activity : activities) {
            LocalDate activityDate = activity.getStartDate().toLocalDate();
            if (dailyTrimp.containsKey(activityDate)) {
                int score = activity.getTrimp() != null ? activity.getTrimp() : calculateTrimp(activity, athlete);
                dailyTrimp.put(activityDate, dailyTrimp.get(activityDate) + score);
                
                dailyCount.put(activityDate, dailyCount.get(activityDate) + 1);
                dailyDistance.put(activityDate, dailyDistance.get(activityDate) + (activity.getDistance() != null ? activity.getDistance() : 0.0));
                dailyMovingTime.put(activityDate, dailyMovingTime.get(activityDate) + (activity.getMovingTime() != null ? activity.getMovingTime() : 0.0));
                dailyElevation.put(activityDate, dailyElevation.get(activityDate) + (activity.getTotalElevationGain() != null ? activity.getTotalElevationGain() : 0.0));
            }
        }

        List<DailyMetrics> timeline = new ArrayList<>();
        double ctl = 0.0; // Chronic Training Load (42 days)
        double atl = 0.0; // Acute Training Load (7 days)
        
        cur = calculationStartDate;
        while (!cur.isAfter(requestEndDate)) {
            double trimp = dailyTrimp.get(cur);
            
            ctl = ctl + (trimp - ctl) / 42.0;
            atl = atl + (trimp - atl) / 7.0;
            double form = ctl - atl;
            
            String status = "Neutral";
            if (form > 15) {
                status = "Fresh";
            } else if (form >= -15 && form <= 5) {
                status = "Optimal";
            } else if (form < -30) {
                status = "Overreaching";
            } else if (form < -15) {
                status = "Warning";
            } else if (form > 5 && form <= 15) {
                status = "Detraining";
            }

            // Only add to timeline if it's within the requested range
            if (!cur.isBefore(requestStartDate) && !cur.isAfter(requestEndDate)) {
                DailyMetrics metrics = new DailyMetrics(cur, trimp, ctl, atl, form, status);
                metrics.activityCount = dailyCount.get(cur);
                metrics.totalDistance = Math.round(dailyDistance.get(cur) * 10.0) / 10.0;
                metrics.totalMovingTime = Math.round(dailyMovingTime.get(cur));
                metrics.totalElevationGain = Math.round(dailyElevation.get(cur));
                timeline.add(metrics);
            }

            cur = cur.plusDays(1);
        }

        return timeline;
    }

    /**
     * Calculates the time spent in Heart Rate zones (Zones 1-5).
     */
    public Map<String, Double> getHeartRateZonesDistribution(AthleteProfile athlete) {
        List<Activity> activities = activityRepository.findByAthleteIdOrderByStartDateDesc(athlete.getId());
        
        int restingHr = athlete.getRestingHr() != null ? athlete.getRestingHr() : 60;
        int maxHr = athlete.getMaxHr() != null ? athlete.getMaxHr() : 190;
        int hrRange = maxHr - restingHr;

        double z1Sec = 0, z2Sec = 0, z3Sec = 0, z4Sec = 0, z5Sec = 0;

        for (Activity activity : activities) {
            // Check if activity has GPX stream data
            if (activity.getStreamJson() != null && !activity.getStreamJson().isEmpty()) {
                try {
                    // Try parsing stream points to get exact seconds spent in each zone
                    List<Map<String, Object>> stream = objectMapper.readValue(
                        activity.getStreamJson(), 
                        new TypeReference<List<Map<String, Object>>>() {}
                    );
                    
                    if (stream != null && !stream.isEmpty()) {
                        for (Map<String, Object> point : stream) {
                            if (point.containsKey("hr")) {
                                int hr = ((Number) point.get("hr")).intValue();
                                if (hr < restingHr + 0.60 * hrRange) {
                                    z1Sec += 1;
                                } else if (hr < restingHr + 0.70 * hrRange) {
                                    z2Sec += 1;
                                } else if (hr < restingHr + 0.80 * hrRange) {
                                    z3Sec += 1;
                                } else if (hr < restingHr + 0.90 * hrRange) {
                                    z4Sec += 1;
                                } else {
                                    z5Sec += 1;
                                }
                            }
                        }
                        continue; // Proceed to next activity
                    }
                } catch (Exception e) {
                    // Fallback to average heart rate distribution if stream parse fails
                }
            }

            // Fallback: If no stream data, use the average heart rate of the activity
            if (activity.getAverageHr() != null) {
                int avgHr = activity.getAverageHr();
                double durationSec = activity.getMovingTime();
                
                if (avgHr < restingHr + 0.60 * hrRange) {
                    z1Sec += durationSec;
                } else if (avgHr < restingHr + 0.70 * hrRange) {
                    z2Sec += durationSec;
                } else if (avgHr < restingHr + 0.80 * hrRange) {
                    z3Sec += durationSec;
                } else if (avgHr < restingHr + 0.90 * hrRange) {
                    z4Sec += durationSec;
                } else {
                    z5Sec += durationSec;
                }
            }
        }

        // Convert seconds to minutes for clean reporting
        Map<String, Double> zones = new LinkedHashMap<>();
        zones.put("Zone 1 (Recovery)", Math.round((z1Sec / 60.0) * 10.0) / 10.0);
        zones.put("Zone 2 (Aerobic)", Math.round((z2Sec / 60.0) * 10.0) / 10.0);
        zones.put("Zone 3 (Tempo)", Math.round((z3Sec / 60.0) * 10.0) / 10.0);
        zones.put("Zone 4 (Threshold)", Math.round((z4Sec / 60.0) * 10.0) / 10.0);
        zones.put("Zone 5 (Anaerobic)", Math.round((z5Sec / 60.0) * 10.0) / 10.0);

        return zones;
    }
}
