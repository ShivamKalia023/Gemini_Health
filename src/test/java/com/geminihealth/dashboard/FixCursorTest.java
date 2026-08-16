package com.geminihealth.dashboard;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@SpringBootTest
public class FixCursorTest {

    @Autowired
    private AthleteRepository athleteRepository;

    @Test
    public void testAndRecoverCursor() {
        AthleteProfile athlete = athleteRepository.findById(4L).orElse(null);
        if (athlete == null) {
            System.out.println("ATHLETE 4 NOT FOUND");
            return;
        }

        LocalDateTime syncTime = athlete.getLastStravaSync();
        System.out.println("CURRENT_CURSOR: " + syncTime);

        // Recover cursor if it has been advanced past when the application failed
        // We subtract 7 days to be safe and ensure any activities recorded during the outage are picked up.
        // It's safe to overlap because duplicate protection will prevent double-insertions.
        if (syncTime != null && syncTime.isAfter(LocalDateTime.now(ZoneOffset.UTC).minusDays(2))) {
            LocalDateTime recovered = syncTime.minusDays(7);
            athlete.setLastStravaSync(recovered);
            athleteRepository.save(athlete);
            System.out.println("RECOVERED_CURSOR: " + recovered);
        } else {
            System.out.println("RECOVERED_CURSOR: Cursor seems safe, no change needed.");
        }
    }
}
