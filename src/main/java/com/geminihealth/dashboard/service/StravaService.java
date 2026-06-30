package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    @Override
    public void run(String... args) throws Exception {
        // Pre-populate database with default archetypes if empty
        if (athleteRepository.count() == 0) {
            log.info("Database is empty. Pre-loading default athlete archetypes (Runner, Cyclist, Hybrid)...");
            createDefaultProfiles();
            log.info("Default archetypes loaded successfully.");
        }
    }

    /**
     * Parses a Strava profile link, extracts athlete identifier, and imports/simulates the athlete profile.
     */
    public AthleteProfile importAthleteFromUrl(String url) {
        log.info("Received Strava profile URL import request: " + url);
        String stravaId = parseAthleteId(url);
        
        Optional<AthleteProfile> existing = athleteRepository.findByStravaId(stravaId);
        if (existing.isPresent()) {
            log.info("Athlete with Strava ID " + stravaId + " already exists in the database. Selecting them.");
            return existing.get();
        }

        // Create new athlete profile
        String name = "Athlete #" + stravaId;
        String avatarUrl = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=120"; // standard sport avatar
        String sport = "Run";
        double goal = 50.0;
        
        // Custom name and sport based on ID seed to make it feel personalized
        int idSeed = stravaId.hashCode();
        String[] firstNames = {"Ryan", "Elena", "Liam", "Sophia", "Chris", "Emma", "Jessica", "Tyler"};
        String[] lastNames = {"Miller", "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White"};
        Random r = new Random(idSeed);
        
        name = firstNames[Math.abs(r.nextInt()) % firstNames.length] + " " + lastNames[Math.abs(r.nextInt()) % lastNames.length];
        
        int sportPick = Math.abs(r.nextInt()) % 3;
        if (sportPick == 0) {
            sport = "Run";
            goal = 40.0 + (Math.abs(r.nextInt()) % 30);
        } else if (sportPick == 1) {
            sport = "Ride";
            goal = 120.0 + (Math.abs(r.nextInt()) % 150);
        } else {
            sport = "Gym/Run";
            goal = 30.0 + (Math.abs(r.nextInt()) % 20);
        }

        AthleteProfile athlete = new AthleteProfile(
            stravaId,
            name,
            avatarUrl,
            "San Francisco", "California", "USA",
            sport,
            goal,
            sport.equals("Ride") ? 220 + (Math.abs(r.nextInt()) % 80) : null,
            60 + (r.nextInt(15) - 5),
            185 + (r.nextInt(20) - 10),
            65.0 + (r.nextInt(20))
        );

        athlete = athleteRepository.save(athlete);
        
        // Generate simulated activities for the last 60 days
        log.info("Generating training history for newly imported athlete: " + name);
        generateMockHistoryForAthlete(athlete, 60);
        
        log.info("Profile " + name + " imported successfully.");
        return athlete;
    }

    // --- Helper Methods ---

    /**
     * Extracts the athlete ID from a standard Strava URL.
     * E.g., https://www.strava.com/athletes/12345678 -> "12345678"
     */
    public String parseAthleteId(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("Strava URL cannot be empty");
        }
        
        String cleanUrl = url.trim().toLowerCase();
        
        // Handle trailing slashes
        if (cleanUrl.endsWith("/")) {
            cleanUrl = cleanUrl.substring(0, cleanUrl.length() - 1);
        }

        // Find athlete segment
        if (cleanUrl.contains("/athletes/")) {
            int idx = cleanUrl.indexOf("/athletes/") + "/athletes/".length();
            String idPart = cleanUrl.substring(idx);
            // In case of query parameters (e.g. ?hl=en)
            if (idPart.contains("?")) {
                idPart = idPart.substring(0, idPart.indexOf("?"));
            }
            return idPart;
        }
        
        // Fallback: If they enter a number or username directly, treat it as the ID
        String val = url.trim();
        if (val.matches("\\d+")) {
            return val;
        }
        
        // Return cleaned representation
        return val.replaceAll("[^a-zA-Z0-9]", "_");
    }

    private void createDefaultProfiles() {
        // 1. Alex Carter (Ultra-runner)
        AthleteProfile alex = new AthleteProfile(
            "alex_carter_runner",
            "Alex Carter",
            "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=150",
            "Boulder", "Colorado", "USA",
            "Run",
            75.0, // km/week
            null,
            42,  // resting HR
            185, // max HR
            68.5 // kg
        );
        alex = athleteRepository.save(alex);
        generateMockHistoryForAthlete(alex, 90);

        // 2. Sarah Chen (Road Cyclist)
        AthleteProfile sarah = new AthleteProfile(
            "sarah_chen_cyclist",
            "Sarah Chen",
            "https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?auto=format&fit=crop&q=80&w=150",
            "Vancouver", "BC", "Canada",
            "Ride",
            240.0, // km/week
            285,   // FTP (Watts)
            48,    // resting HR
            192,   // max HR
            59.0   // kg
        );
        sarah = athleteRepository.save(sarah);
        generateMockHistoryForAthlete(sarah, 90);

        // 3. Marcus Vance (Hybrid Athlete)
        AthleteProfile marcus = new AthleteProfile(
            "marcus_vance_hybrid",
            "Marcus Vance",
            "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=150",
            "Austin", "Texas", "USA",
            "Gym/Run",
            35.0, // km/week
            null,
            54,  // resting HR
            188, // max HR
            82.0 // kg
        );
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

            // Determine if athlete trains today
            boolean trains = false;
            double randVal = r.nextDouble();

            if (primarySport.equals("Run") && randVal < 0.6) { // 4-5 times a week running
                trains = true;
            } else if (primarySport.equals("Ride") && randVal < 0.7) { // 5 times a week riding
                trains = true;
            } else if (primarySport.equals("Gym/Run") && randVal < 0.8) { // 5-6 times hybrid training
                trains = true;
            }

            if (!trains) {
                continue;
            }

            // Decide workout type
            Activity act = new Activity();
            act.setAthlete(athlete);
            act.setStartDate(date);

            if (primarySport.equals("Run")) {
                boolean longRun = (date.getDayOfWeek().getValue() == 7); // Sunday long run
                double distance = longRun ? 20 + r.nextInt(15) : 8 + r.nextInt(8);
                int avgHr = longRun ? 135 + r.nextInt(10) : 142 + r.nextInt(15);
                int durationSeconds = (int) (distance * (5.5 + r.nextDouble() * 0.5) * 60); // ~5:30 min/km pace
                
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
                boolean longRide = (date.getDayOfWeek().getValue() == 6); // Saturday long ride
                double distance = longRide ? 80 + r.nextInt(60) : 30 + r.nextInt(25);
                int avgHr = longRide ? 130 + r.nextInt(10) : 145 + r.nextInt(15);
                int durationSeconds = (int) (distance * (2.0 + r.nextDouble() * 0.3) * 60); // ~30 km/h pace
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

            } else { // Hybrid
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

            // Calculate TRIMP
            act.setTrimp(performanceService.calculateTrimp(act, athlete));
            activityRepository.save(act);
        }
    }
}
