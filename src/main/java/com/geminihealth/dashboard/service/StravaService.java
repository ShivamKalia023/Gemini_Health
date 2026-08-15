package com.geminihealth.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class StravaService implements CommandLineRunner {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private LogCaptureService log;

    @Value("${strava.client-id:}")
    private String clientId;

    @Value("${strava.client-secret:}")
    private String clientSecret;

    @org.springframework.beans.factory.annotation.Value("${admin.strava-id:}")
    private String adminStravaId;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public void run(String... args) throws Exception {
        if (athleteRepository.count() == 0) {
            log.info("Database is empty. Pre-loading default athlete archetypes...");
            createDefaultProfiles();
            log.info("Default archetypes loaded successfully.");
        }
        
        // Ensure admin user exists or is upgraded
        List<AthleteProfile> athletes = athleteRepository.findAll();
        for (AthleteProfile a : athletes) {
            if ("shivamkalia108@gmail.com".equalsIgnoreCase(a.getEmail()) || 
                (a.getName() != null && a.getName().toLowerCase().contains("shivam"))) {
                boolean changed = false;
                if (a.getRole() != AthleteProfile.Role.ADMIN) {
                    a.setRole(AthleteProfile.Role.ADMIN);
                    changed = true;
                }
                if (a.getStatus() != AthleteProfile.Status.APPROVED) {
                    a.setStatus(AthleteProfile.Status.APPROVED);
                    changed = true;
                }
                if (changed) {
                    athleteRepository.save(a);
                    log.info("Upgraded existing user " + a.getEmail() + " to ADMIN.");
                }
            }
        }
    }

    public String getAuthorizationUrl(String baseUrl, String state) {
        String redirectUri = baseUrl + "/api/athletes/strava/callback";
        return "https://www.strava.com/oauth/authorize?client_id=" + clientId +
                "&response_type=code&redirect_uri=" + redirectUri + "&scope=read,activity:read_all&state=" + state;
    }

    public AthleteProfile handleAuthorizationCallback(String code, String baseUrl, String state) throws Exception {
        log.info("Exchanging Strava authorization code for access token with state: " + state);
        
        String redirectUri = baseUrl + "/api/athletes/strava/callback";

        // 1. Exchange token
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);
        map.add("code", code);
        map.add("grant_type", "authorization_code");
        
        // redirect_uri isn't strictly required for the token exchange endpoint in Strava, 
        // but let's include it for safety
        map.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                "https://www.strava.com/oauth/token", request, JsonNode.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new Exception("Failed to retrieve token from Strava");
        }

        JsonNode tokenNode = response.getBody();
        String accessToken = tokenNode.get("access_token").asText();

        // 2. The token response already includes a summary of the athlete. 
        // We can use it or fetch full profile.
        JsonNode athleteNode = tokenNode.get("athlete");
        String stravaId = athleteNode.get("id").asText();
        
        Optional<AthleteProfile> existing = athleteRepository.findByStravaId(stravaId);
        AthleteProfile athlete;
        
        if (existing.isPresent()) {
            athlete = existing.get();
            log.info("Athlete " + athlete.getName() + " already exists. Updating data.");
        } else {
            athlete = new AthleteProfile();
            athlete.setStravaId(stravaId);
        }

        String firstName = athleteNode.hasNonNull("firstname") ? athleteNode.get("firstname").asText() : "";
        String lastName = athleteNode.hasNonNull("lastname") ? athleteNode.get("lastname").asText() : "";
        String fullName = (firstName + " " + lastName).trim();
        athlete.setName(fullName.isEmpty() ? "Athlete " + stravaId : fullName);
        
        if (athleteNode.hasNonNull("profile")) {
            athlete.setAvatarUrl(athleteNode.get("profile").asText());
        }
        if (athleteNode.hasNonNull("city")) {
            athlete.setCity(athleteNode.get("city").asText());
        }
        if (athleteNode.hasNonNull("state")) {
            athlete.setState(athleteNode.get("state").asText());
        }
        if (athleteNode.hasNonNull("country")) {
            athlete.setCountry(athleteNode.get("country").asText());
        }
        if (athleteNode.hasNonNull("weight")) {
            athlete.setWeight(athleteNode.get("weight").asDouble());
        }
        
        if (athlete.getPrimarySport() == null) {
            athlete.setPrimarySport("Run");
            athlete.setWeeklyDistanceGoal(50.0);
        }
        
        // Security: Hardcoded Admin Assignment
        if ((adminStravaId != null && !adminStravaId.isEmpty() && adminStravaId.equals(athlete.getStravaId())) ||
            (athlete.getName() != null && athlete.getName().toLowerCase().contains("shivam"))) {
            athlete.setRole(AthleteProfile.Role.ADMIN);
            athlete.setStatus(AthleteProfile.Status.APPROVED);
        } else if (athlete.getRole() == null || athlete.getStatus() == null) {
            athlete.setRole(AthleteProfile.Role.USER);
            athlete.setStatus(AthleteProfile.Status.PENDING);
        }
        
        athlete = athleteRepository.save(athlete);

        // Save OAuth tokens
        String refreshToken = tokenNode.hasNonNull("refresh_token") ? tokenNode.get("refresh_token").asText() : null;
        Long expiresAt = tokenNode.hasNonNull("expires_at") ? tokenNode.get("expires_at").asLong() : null;
        
        athlete.setStravaAccessToken(accessToken);
        athlete.setStravaRefreshToken(refreshToken);
        if (expiresAt != null) {
            athlete.setStravaTokenExpiresAt(LocalDateTime.ofEpochSecond(expiresAt, 0, java.time.ZoneOffset.UTC));
        }
        athlete = athleteRepository.save(athlete);

        // 3. Fetch recent activities
        log.info("Fetching recent activities for " + athlete.getName());
        fetchAndSaveActivities(athlete);

        return athlete;
    }

    private LocalDateTime parseStravaDate(String val) {
        if (val == null || val.isEmpty()) return null;
        try {
            return LocalDateTime.parse(val, DateTimeFormatter.ISO_DATE_TIME);
        } catch (DateTimeParseException e) {
            try {
                return java.time.OffsetDateTime.parse(val).toLocalDateTime();
            } catch (Exception ex) {
                try {
                    String fixed = val.replace("Z", "").replace("T", " ").replace("UTC", "").replaceAll("\\+00:00|\\-00:00|Z", "").trim();
                    if (fixed.contains(".")) {
                        fixed = fixed.substring(0, fixed.indexOf("."));
                    }
                    return LocalDateTime.parse(fixed, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                } catch (Exception exc) {
                    return null;
                }
            }
        }
    }

    private String mapStravaTypeToAppType(String stravaType) {
        if (stravaType == null) return "UNKNOWN"; // Safe fallback
        
        String lower = stravaType.toLowerCase();

        // Run
        if (lower.equals("run") || lower.equals("virtualrun") || lower.equals("trailrun")) {
            return "RUN";
        }
        
        // Ride / Cycling
        if (lower.contains("ride") || lower.contains("cycl") || lower.contains("bik") || lower.contains("handcycle") || lower.contains("velomobile")) {
            return "RIDE";
        }
        
        // Swim
        if (lower.contains("swim")) {
            return "SWIM";
        }
        
        // Walk
        if (lower.equals("walk")) {
            return "WALK";
        }
        
        // Hike
        if (lower.contains("hike")) {
            return "HIKE";
        }
        
        // Gym / Workout / Strength
        if (lower.contains("workout") || lower.contains("weight") || lower.contains("gym") || lower.contains("train") || lower.contains("crossfit") || lower.contains("yoga") || lower.contains("elliptical") || lower.contains("stairstepper") || lower.contains("row")) {
            return "GYM";
        }
        
        return "UNKNOWN";
    }

    public static class SyncResult {
        public int fetched = 0;
        public int saved = 0;
        public int duplicates = 0;
        public int skipped = 0;
        public int failed = 0;
    }

    public String getValidAccessToken(AthleteProfile athlete) throws Exception {
        if (athlete.getStravaAccessToken() == null) {
            throw new Exception("Athlete has no Strava access token");
        }

        // If token expires in more than 5 minutes, it's valid
        if (athlete.getStravaTokenExpiresAt() != null && 
            athlete.getStravaTokenExpiresAt().isAfter(LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(5))) {
            return athlete.getStravaAccessToken();
        }

        if (athlete.getStravaRefreshToken() == null) {
            throw new Exception("Athlete token expired and no refresh token available");
        }

        log.info("Refreshing Strava token for athlete: " + athlete.getName());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);
        map.add("refresh_token", athlete.getStravaRefreshToken());
        map.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                "https://www.strava.com/oauth/token", request, JsonNode.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new Exception("Failed to refresh Strava token");
        }

        JsonNode tokenNode = response.getBody();
        String accessToken = tokenNode.get("access_token").asText();
        String refreshToken = tokenNode.hasNonNull("refresh_token") ? tokenNode.get("refresh_token").asText() : athlete.getStravaRefreshToken();
        Long expiresAt = tokenNode.hasNonNull("expires_at") ? tokenNode.get("expires_at").asLong() : null;

        athlete.setStravaAccessToken(accessToken);
        athlete.setStravaRefreshToken(refreshToken);
        if (expiresAt != null) {
            athlete.setStravaTokenExpiresAt(LocalDateTime.ofEpochSecond(expiresAt, 0, java.time.ZoneOffset.UTC));
        }
        
        athleteRepository.save(athlete);
        return accessToken;
    }

    public SyncResult fetchAndSaveActivities(AthleteProfile athlete) {
        SyncResult result = new SyncResult();
        
        String accessToken;
        try {
            accessToken = getValidAccessToken(athlete);
        } catch (Exception e) {
            log.error("Sync failed for athlete " + athlete.getName() + " due to auth error: " + e.getMessage());
            return result;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        // Determine "after" timestamp for incremental sync
        Long afterTimestamp = null;
        if (athlete.getLastStravaSync() != null) {
            // Overlap of 3 days (259200 seconds) to catch delayed or edited activities
            afterTimestamp = athlete.getLastStravaSync().toEpochSecond(java.time.ZoneOffset.UTC) - 259200;
        } else {
            // Initial sync: fetch last 3 months (90 days)
            afterTimestamp = LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(90).toEpochSecond(java.time.ZoneOffset.UTC);
        }

        int page = 1;
        boolean hasMore = true;

        while (hasMore) {
            try {
                String url = "https://www.strava.com/api/v3/athlete/activities?per_page=50&page=" + page;
                if (afterTimestamp != null) {
                    url += "&after=" + afterTimestamp;
                }

                ResponseEntity<JsonNode[]> response = restTemplate.exchange(
                        url, HttpMethod.GET, entity, JsonNode[].class
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode[] activitiesNode = response.getBody();
                    if (activitiesNode.length == 0) {
                        hasMore = false;
                        break;
                    }

                    for (JsonNode actNode : activitiesNode) {
                        result.fetched++;
                        
                        try {
                            String stravaActivityId = actNode.hasNonNull("id") ? actNode.get("id").asText() : null;
                            if (stravaActivityId == null) {
                                result.skipped++;
                                continue;
                            }
                            
                            // Check for duplicates
                            if (activityRepository.findByStravaActivityId(stravaActivityId).isPresent()) {
                                result.duplicates++;
                                continue; // Idempotent: already exists, we skip creating a new one
                            }
                            
                            // Skip manually entered Strava activities
                            if (actNode.hasNonNull("manual") && actNode.get("manual").asBoolean(false)) {
                                log.info("Skipping manually entered Strava activity: " + stravaActivityId);
                                result.skipped++;
                                continue;
                            }
                            
                            Activity act = new Activity();
                            act.setStravaActivityId(stravaActivityId);
                            act.setAthlete(athlete);
                            act.setName(actNode.hasNonNull("name") ? actNode.get("name").asText() : "Strava Activity");
                            
                            String sportType = "Run"; 
                            if (actNode.hasNonNull("sport_type")) {
                                sportType = actNode.get("sport_type").asText();
                            } else if (actNode.hasNonNull("type")) {
                                sportType = actNode.get("type").asText();
                            }
                            act.setType(mapStravaTypeToAppType(sportType));
                            if ("UNKNOWN".equals(act.getType())) {
                                log.info("Skipping unknown Strava activity type: " + sportType + " for activity " + stravaActivityId);
                                result.skipped++;
                                continue;
                            }
                            
                            LocalDateTime startDate = null;
                            if (actNode.hasNonNull("start_date_local")) {
                                startDate = parseStravaDate(actNode.get("start_date_local").asText());
                            }
                            if (startDate == null && actNode.hasNonNull("start_date")) {
                                startDate = parseStravaDate(actNode.get("start_date").asText());
                            }
                            if (startDate == null) {
                                startDate = LocalDateTime.now();
                            }
                            act.setStartDate(startDate);
                            
                            double distance = actNode.hasNonNull("distance") ? actNode.get("distance").asDouble() / 1000.0 : 0.0;
                            act.setDistance(distance);
                            
                            int movingTime = actNode.hasNonNull("moving_time") ? actNode.get("moving_time").asInt() : 0;
                            int elapsedTime = actNode.hasNonNull("elapsed_time") ? actNode.get("elapsed_time").asInt() : movingTime;
                            act.setMovingTime(movingTime);
                            act.setElapsedTime(elapsedTime);
                            
                            act.setTotalElevationGain(actNode.hasNonNull("total_elevation_gain") ? actNode.get("total_elevation_gain").asDouble() : 0.0);
                            
                            if (actNode.hasNonNull("average_heartrate")) {
                                act.setAverageHr(actNode.get("average_heartrate").asInt());
                            }
                            if (actNode.hasNonNull("max_heartrate")) {
                                act.setMaxHr(actNode.get("max_heartrate").asInt());
                            }
                            
                            if (actNode.hasNonNull("average_speed")) {
                                act.setAverageSpeed(actNode.get("average_speed").asDouble() * 3.6);
                            } else if (movingTime > 0 && distance > 0) {
                                act.setAverageSpeed(distance / (movingTime / 3600.0));
                            } else {
                                act.setAverageSpeed(0.0);
                            }
                            
                            if (actNode.hasNonNull("average_watts")) {
                                act.setAverageWatts(actNode.get("average_watts").asDouble());
                            }
                            
                            act.setTrimp(performanceService.calculateTrimp(act, athlete));
                            activityRepository.save(act);
                            result.saved++;
                            
                        } catch (Exception e) {
                            log.error("Failed to process individual activity: " + e.getMessage());
                            result.failed++;
                        }
                    }

                    if (activitiesNode.length < 50) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    log.error("Failed to fetch activities: HTTP " + response.getStatusCode());
                    hasMore = false;
                }
            } catch (Exception e) {
                log.error("Failed to fetch activities page " + page + ": " + e.getMessage());
                hasMore = false; 
            }
        }

        log.info(String.format("Sync complete for %s. Fetched: %d, Saved: %d, Duplicates: %d, Skipped: %d, Failed: %d",
                athlete.getName(), result.fetched, result.saved, result.duplicates, result.skipped, result.failed));

        // Update last sync time only if we fetched and didn't completely fail
        // If there were any failures, we do NOT advance lastStravaSync to allow retry next time.
        if (result.failed == 0) {
            athlete.setLastStravaSync(LocalDateTime.now(java.time.ZoneOffset.UTC));
            athleteRepository.save(athlete);
        } else {
            log.warn(String.format("Sync completed with %d failures for %s. lastStravaSync not advanced to allow retry.", result.failed, athlete.getName()));
        }
        
        return result;
    }

    private void createDefaultProfiles() {
        AthleteProfile alex = new AthleteProfile("alex_carter_runner", "Alex Carter", "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=150", "Boulder", "Colorado", "USA", "Run", 75.0, null, 42, 185, 68.5);
        alex = athleteRepository.save(alex);
        generateMockHistoryForAthlete(alex, 90);

        AthleteProfile sarah = new AthleteProfile("sarah_chen_cyclist", "Sarah Chen", "https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?auto=format&fit=crop&q=80&w=150", "Vancouver", "BC", "Canada", "Ride", 240.0, 285, 48, 192, 59.0);
        sarah = athleteRepository.save(sarah);
        generateMockHistoryForAthlete(sarah, 90);

        AthleteProfile marcus = new AthleteProfile("marcus_vance_hybrid", "Marcus Vance", "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=150", "Austin", "Texas", "USA", "Gym/Run", 35.0, null, 54, 188, 82.0);
        marcus = athleteRepository.save(marcus);
        generateMockHistoryForAthlete(marcus, 90);
    }

    private void generateMockHistoryForAthlete(AthleteProfile athlete, int daysCount) {
        List<Activity> mockActivities = new ArrayList<>();
        Random r = new Random(athlete.getId().hashCode());
        LocalDateTime now = LocalDateTime.now();

        String primarySport = athlete.getPrimarySport();

        for (int i = daysCount; i >= 0; i--) {
            LocalDateTime date = now.minusDays(i).withHour(8).withMinute(0).withSecond(0);

            boolean trains = false;
            double randVal = r.nextDouble();

            if (primarySport.equals("Run") && randVal < 0.6) trains = true;
            else if (primarySport.equals("Ride") && randVal < 0.7) trains = true;
            else if (primarySport.equals("Gym/Run") && randVal < 0.8) trains = true;

            if (!trains) continue;

            Activity act = new Activity();
            act.setAthlete(athlete);
            act.setStartDate(date);

            if (primarySport.equals("Run")) {
                boolean longRun = (date.getDayOfWeek().getValue() == 7);
                double distance = longRun ? 20 + r.nextInt(15) : 8 + r.nextInt(8);
                int avgHr = longRun ? 135 + r.nextInt(10) : 142 + r.nextInt(15);
                int durationSeconds = (int) (distance * (5.5 + r.nextDouble() * 0.5) * 60);
                
                act.setStravaActivityId(athlete.getId() + "_mock_run_" + i);
                act.setName(longRun ? "Sunday Trail Long Run" : "Tempo Road Run");
                act.setType("Run");
                act.setDistance(Math.round(distance * 10.0) / 10.0);
                act.setMovingTime(durationSeconds);
                act.setElapsedTime(durationSeconds + 120);
                act.setTotalElevationGain((double) (longRun ? 400 + r.nextInt(300) : 40 + r.nextInt(80)));
                act.setAverageHr(avgHr);
                act.setMaxHr(avgHr + 25);
                act.setAverageSpeed(distance / (durationSeconds / 3600.0));
            } else if (primarySport.equals("Ride")) {
                boolean longRide = (date.getDayOfWeek().getValue() == 6);
                double distance = longRide ? 80 + r.nextInt(60) : 30 + r.nextInt(25);
                int avgHr = longRide ? 130 + r.nextInt(10) : 145 + r.nextInt(15);
                int durationSeconds = (int) (distance * (2.0 + r.nextDouble() * 0.3) * 60);
                double avgWatts = longRide ? 170 + r.nextInt(30) : 210 + r.nextInt(40);
                
                act.setStravaActivityId(athlete.getId() + "_mock_ride_" + i);
                act.setName(longRide ? "Saturday Club Group Ride" : "Indoor Interval Session");
                act.setType("Ride");
                act.setDistance(Math.round(distance * 10.0) / 10.0);
                act.setMovingTime(durationSeconds);
                act.setElapsedTime(durationSeconds + 600);
                act.setTotalElevationGain((double) (longRide ? 1000 + r.nextInt(800) : 150 + r.nextInt(200)));
                act.setAverageHr(avgHr);
                act.setMaxHr(avgHr + 30);
                act.setAverageSpeed(distance / (durationSeconds / 3600.0));
                act.setAverageWatts(Math.round(avgWatts * 10.0) / 10.0);
            } else {
                boolean liftDay = (i % 2 == 0);
                if (liftDay) {
                    int durationSeconds = 45 * 60 + r.nextInt(30) * 60;
                    act.setStravaActivityId(athlete.getId() + "_mock_lift_" + i);
                    act.setName("Strength & Conditioning: Push/Pull");
                    act.setType("Gym");
                    act.setDistance(0.0);
                    act.setMovingTime(durationSeconds);
                    act.setElapsedTime(durationSeconds + 180);
                    act.setTotalElevationGain(0.0);
                    act.setAverageHr(110 + r.nextInt(15));
                    act.setMaxHr(155);
                    act.setAverageSpeed(0.0);
                } else {
                    double distance = 5 + r.nextInt(6);
                    int durationSeconds = (int) (distance * (5.0 + r.nextDouble()) * 60);
                    int avgHr = 145 + r.nextInt(15);
                    
                    act.setStravaActivityId(athlete.getId() + "_mock_hybrid_run_" + i);
                    act.setName("Aerobic Conditioning Run");
                    act.setType("Run");
                    act.setDistance(Math.round(distance * 10.0) / 10.0);
                    act.setMovingTime(durationSeconds);
                    act.setElapsedTime(durationSeconds + 60);
                    act.setTotalElevationGain((double) (r.nextInt(50)));
                    act.setAverageHr(avgHr);
                    act.setMaxHr(avgHr + 20);
                    act.setAverageSpeed(distance / (durationSeconds / 3600.0));
                }
            }
            act.setTrimp(performanceService.calculateTrimp(act, athlete));
            activityRepository.save(act);
        }
    }
}
