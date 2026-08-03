package com.geminihealth.dashboard.service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ActivityTypeMapper {

    private static final Map<String, List<String>> CHALLENGE_TO_STRAVA_MAPPING = new HashMap<>();

    static {
        // Run mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Run", Arrays.asList("Run", "VirtualRun", "TrailRun"));
        
        // Ride mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Ride", Arrays.asList("Ride", "VirtualRide", "MountainBikeRide", "GravelRide", "EBikeRide", "Handcycle", "Velomobile"));
        
        // Walk mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Walk", Arrays.asList("Walk"));
        
        // Hike mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Hike", Arrays.asList("Hike"));
        
        // Swim mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Swim", Arrays.asList("Swim"));
        
        // Workout / Gym mappings
        CHALLENGE_TO_STRAVA_MAPPING.put("Workout", Arrays.asList("Workout", "WeightTraining", "Crossfit", "Yoga", "Elliptical", "StairStepper", "Row"));
    }

    /**
     * Determines if a given Strava activity type qualifies for a specific Challenge activity type.
     *
     * @param challengeType The activity type specified in the Challenge (e.g., "Run", "Ride", "Any").
     * @param stravaType    The activity type reported by Strava (e.g., "VirtualRun", "WeightTraining").
     * @return true if the stravaType qualifies for the challengeType, false otherwise.
     */
    public static boolean matches(String challengeType, String stravaType) {
        if (challengeType == null || challengeType.trim().isEmpty() || challengeType.equalsIgnoreCase("Any")) {
            return true; // "Any" challenge matches all activities
        }

        if (stravaType == null || stravaType.trim().isEmpty()) {
            return false; // Invalid strava activity
        }

        // Case-insensitive lookup for challenge type
        String normalizedChallengeType = challengeType.trim();
        List<String> validStravaTypes = null;
        
        for (Map.Entry<String, List<String>> entry : CHALLENGE_TO_STRAVA_MAPPING.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(normalizedChallengeType)) {
                validStravaTypes = entry.getValue();
                break;
            }
        }

        if (validStravaTypes != null) {
            // Check if stravaType is in the valid list (case-insensitive)
            for (String validStravaType : validStravaTypes) {
                if (validStravaType.equalsIgnoreCase(stravaType.trim())) {
                    return true;
                }
            }
            return false; // Did not match any valid type for this challenge
        }

        // Fallback for custom or exact matches if not explicitly mapped
        return challengeType.equalsIgnoreCase(stravaType.trim());
    }
}
