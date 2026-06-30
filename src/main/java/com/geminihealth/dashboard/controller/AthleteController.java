package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.service.FileImportService;
import com.geminihealth.dashboard.service.LogCaptureService;
import com.geminihealth.dashboard.service.PerformanceService;
import com.geminihealth.dashboard.service.StravaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/athletes")
@CrossOrigin(origins = "*")
public class AthleteController {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private StravaService stravaService;

    @Autowired
    private FileImportService fileImportService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private LogCaptureService log;

    @Value("${admin.strava-id:}")
    private String adminStravaId;

    @GetMapping
    public ResponseEntity<List<AthleteProfile>> getAllAthletes() {
        return ResponseEntity.ok(athleteRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createAthlete(@RequestBody Map<String, Object> request) {
        try {
            String name = request.getOrDefault("name", "").toString().trim();
            if (name.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Athlete name is required"));
            }

            // Check existing by name
            var existing = athleteRepository.findByName(name);
            if (existing.isPresent()) {
                return ResponseEntity.ok(existing.get());
            }

            AthleteProfile profile = new AthleteProfile();
            profile.setName(name);
            if (request.containsKey("primarySport")) profile.setPrimarySport(request.get("primarySport").toString());
            if (request.containsKey("city")) profile.setCity(request.get("city").toString());
            if (request.containsKey("state")) profile.setState(request.get("state").toString());
            if (request.containsKey("country")) profile.setCountry(request.get("country").toString());

            AthleteProfile saved = athleteRepository.save(profile);
            log.info("Created new athlete profile: " + saved.getName() + " (ID: " + saved.getId() + ")");
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to create athlete: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<AthleteProfile> getAthleteById(@PathVariable Long id) {
        return athleteRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/activities")
    public ResponseEntity<List<Activity>> getAthleteActivities(@PathVariable Long id) {
        return athleteRepository.findById(id)
                .map(athlete -> ResponseEntity.ok(activityRepository.findByAthleteIdOrderByStartDateDesc(id)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/performance")
    public ResponseEntity<List<PerformanceService.DailyMetrics>> getAthletePerformance(@PathVariable Long id) {
        return athleteRepository.findById(id)
                .map(athlete -> ResponseEntity.ok(performanceService.getPerformanceTimeline(athlete)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/zones")
    public ResponseEntity<Map<String, Double>> getAthleteZones(@PathVariable Long id) {
        return athleteRepository.findById(id)
                .map(athlete -> ResponseEntity.ok(performanceService.getHeartRateZonesDistribution(athlete)))
                .orElse(ResponseEntity.notFound().build());
    }

    private String getBaseUrl(HttpServletRequest request) {
        String scheme = request.getScheme();             // http
        String serverName = request.getServerName();     // hostname.com
        int serverPort = request.getServerPort();        // 80
        String contextPath = request.getContextPath();   // /mywebapp

        // Reconstruct original requesting URL
        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);

        if (serverPort != 80 && serverPort != 443) {
            url.append(":").append(serverPort);
        }
        url.append(contextPath);
        return url.toString();
    }

    @GetMapping("/strava/login")
    public RedirectView stravaLogin(HttpServletRequest request) {
        String baseUrl = getBaseUrl(request);
        String authUrl = stravaService.getAuthorizationUrl(baseUrl);
        return new RedirectView(authUrl);
    }

    @GetMapping("/strava/callback")
    public RedirectView stravaCallback(@RequestParam(required = false) String code, 
                                       @RequestParam(required = false) String error,
                                       HttpServletRequest request,
                                       HttpServletResponse response) {
        if (error != null) {
            return new RedirectView("/?strava_error=" + URLEncoder.encode(error, StandardCharsets.UTF_8));
        }
        if (code == null) {
            return new RedirectView("/?strava_error=No+code+provided");
        }
        
        try {
            String baseUrl = getBaseUrl(request);
            AthleteProfile profile = stravaService.handleAuthorizationCallback(code, baseUrl);
            
            // Check if admin
            if (adminStravaId != null && !adminStravaId.isEmpty() && adminStravaId.equals(profile.getStravaId())) {
                Cookie adminCookie = new Cookie("admin_token", "true");
                adminCookie.setPath("/");
                adminCookie.setMaxAge(60 * 60 * 24 * 30); // 30 days
                response.addCookie(adminCookie);
            }
            
            return new RedirectView("/?strava_success=true&name=" + URLEncoder.encode(profile.getName(), StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Strava callback error: " + e.getMessage());
            return new RedirectView("/?strava_error=" + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
        }
    }

    @PostMapping("/{id}/upload/csv")
    public ResponseEntity<?> uploadCsv(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            AthleteProfile athlete = athleteRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Athlete not found with ID: " + id));
            
            AthleteProfile updatedAthlete = fileImportService.parseActivitiesCsv(file, athlete);
            
            // Fetch activities to ensure they're loaded for the response
            var activities = activityRepository.findByAthleteIdOrderByStartDateDesc(id);
            log.info("CSV upload completed. Imported " + activities.size() + " total activities for athlete " + id);
            
            return ResponseEntity.ok(updatedAthlete);
        } catch (IllegalArgumentException e) {
            log.error("CSV upload validation failed for athlete " + id + ": " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("CSV upload failed for athlete " + id + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error during file upload", "details", e.getMessage()));
        }
    }

    @PostMapping("/{id}/upload/gpx")
    public ResponseEntity<?> uploadGpx(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            AthleteProfile athlete = athleteRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Athlete not found with ID: " + id));
            
            Activity activity = fileImportService.parseGpxWorkout(file, athlete);
            return ResponseEntity.ok(activity);
        } catch (Exception e) {
            log.error("GPX upload failed for athlete " + id + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAthlete(@PathVariable Long id, @CookieValue(value = "admin_token", required = false) String adminToken) {
        if (!"true".equals(adminToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required to delete profiles."));
        }
        try {
            return athleteRepository.findById(id)
                    .map(athlete -> {
                        athleteRepository.delete(athlete);
                        log.info("Deleted athlete profile: " + athlete.getName() + " (ID: " + id + ")");
                        return ResponseEntity.ok(Map.of("message", "Profile deleted successfully"));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Failed to delete athlete ID " + id + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
