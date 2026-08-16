package com.geminihealth.dashboard;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.Challenge;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.repository.ChallengeRepository;
import com.geminihealth.dashboard.controller.ChallengeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ChallengeLeaderboardTest {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ChallengeRepository challengeRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ChallengeController challengeController;

    @Test
    public void testLeaderboardEligibility() {
        // Create athlete
        AthleteProfile athlete = new AthleteProfile("test_strava_id", "Test User", "", "City", "State", "Country", "Run", 10.0, 200, 60, 190, 70.0);
        athlete = athleteRepository.save(athlete);

        // Create challenge 1 Aug to 5 Aug
        Challenge challenge = new Challenge("Test Challenge", "Desc");
        challenge.setStartDate(LocalDateTime.of(2026, 8, 1, 0, 0));
        challenge.setEndDate(LocalDateTime.of(2026, 8, 5, 23, 59));
        challenge.setActivityType("Run");
        challenge.setGoalType("distance");
        challenge.setTargetValue(10.0);
        challenge.setStatus("Active");
        challenge.addParticipant(athlete); // join date is implicitly now
        challenge = challengeRepository.save(challenge);

        // Create activity on 2 Aug
        Activity activity = new Activity();
        activity.setAthlete(athlete);
        activity.setType("Run");
        activity.setStartDate(LocalDateTime.of(2026, 8, 2, 12, 0));
        activity.setDistance(3.0);
        activityRepository.save(activity);

        // Fetch leaderboard
        ResponseEntity<?> response = challengeController.getChallengeLeaderboard(challenge.getId());
        List<Map<String, Object>> leaderboard = (List<Map<String, Object>>) response.getBody();

        assertNotNull(leaderboard);
        assertEquals(1, leaderboard.size());
        
        Map<String, Object> entry = leaderboard.get(0);
        double progress = (Double) entry.get("progress");
        assertEquals(3.0, progress, 0.001);
    }
}
