package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(value = "strava.sync.enabled", havingValue = "true", matchIfMissing = true)
public class StravaSyncScheduler {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private StravaService stravaService;

    @Autowired
    private LogCaptureService log;

    @Scheduled(fixedDelayString = "${strava.sync.interval:900000}")
    public void syncAllAthletes() {
        log.info("STRAVA SCHEDULED SYNC STARTED");
        
        List<AthleteProfile> connectedAthletes = athleteRepository.findByStravaRefreshTokenIsNotNull();
        log.info("Connected athletes: " + connectedAthletes.size());

        int successful = 0;
        int failedAthletes = 0;
        int totalSaved = 0;
        int totalDuplicates = 0;
        int totalSkipped = 0;
        int totalFailed = 0;

        for (AthleteProfile athlete : connectedAthletes) {
            try {
                StravaService.SyncResult result = stravaService.fetchAndSaveActivities(athlete);
                
                log.info(String.format("Athlete %s (ID: %d): Fetched: %d, Saved: %d, Duplicates: %d, Skipped: %d, Failed: %d",
                        athlete.getName(), athlete.getId(), result.fetched, result.saved, result.duplicates, result.skipped, result.failed));

                successful++;
                totalSaved += result.saved;
                totalDuplicates += result.duplicates;
                totalSkipped += result.skipped;
                totalFailed += result.failed;
            } catch (Exception e) {
                log.error("Failed to synchronize athlete " + athlete.getName() + " (ID: " + athlete.getId() + "): " + e.getMessage());
                failedAthletes++;
            }
        }

        log.info("STRAVA SCHEDULED SYNC COMPLETED");
        log.info("Athletes processed: " + connectedAthletes.size());
        log.info("Successful: " + successful);
        log.info("Failed: " + failedAthletes);
        log.info("Activities saved: " + totalSaved);
        log.info("Duplicates: " + totalDuplicates);
        log.info("Skipped: " + totalSkipped);
        log.info("Failed activities: " + totalFailed);
    }
}
