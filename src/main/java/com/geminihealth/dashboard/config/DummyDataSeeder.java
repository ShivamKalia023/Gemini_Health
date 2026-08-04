package com.geminihealth.dashboard.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DummyDataSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DummyDataSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM athlete_profile WHERE strava_id = 'dummy_strava_vineet'", Integer.class);
            if (count == null || count == 0) {
                String sql = """
                    WITH inserted_athletes AS (
                        INSERT INTO athlete_profile (strava_id, name, avatar_url, city, state, country, primary_sport, resting_hr, max_hr, weight, role, status, created_at, updated_at)
                        VALUES 
                            ('dummy_strava_vineet', 'Vineet', 'https://ui-avatars.com/api/?name=Vineet&background=0D8ABC&color=fff&size=256', 'Delhi', 'DL', 'India', 'Run', 60, 190, 75.0, 'USER', 'APPROVED', NOW(), NOW()),
                            ('dummy_strava_bhavya', 'Bhavya', 'https://ui-avatars.com/api/?name=Bhavya&background=ffb347&color=fff&size=256', 'Mumbai', 'MH', 'India', 'Ride', 65, 185, 62.0, 'USER', 'APPROVED', NOW(), NOW()),
                            ('dummy_strava_test', 'Test User', 'https://ui-avatars.com/api/?name=Test+User&background=333333&color=fff&size=256', 'New York', 'NY', 'USA', 'Swim', 55, 195, 80.0, 'USER', 'APPROVED', NOW(), NOW())
                        RETURNING id, name
                    )
                    INSERT INTO activity (strava_activity_id, athlete_id, name, type, start_date, distance, moving_time, elapsed_time, total_elevation_gain)
                    SELECT 'act_v1_' || id, id, 'Morning 5K Run', 'Run', NOW() - INTERVAL '1 day', 5.0, 1500, 1550, 45.0 FROM inserted_athletes WHERE name = 'Vineet'
                    UNION ALL
                    SELECT 'act_v2_' || id, id, 'Weekend Long Run', 'Run', NOW() - INTERVAL '3 days', 10.0, 3000, 3100, 100.0 FROM inserted_athletes WHERE name = 'Vineet'
                    UNION ALL
                    SELECT 'act_b1_' || id, id, 'Evening Cycle', 'Ride', NOW() - INTERVAL '2 days', 20.0, 3600, 3700, 150.0 FROM inserted_athletes WHERE name = 'Bhavya'
                    UNION ALL
                    SELECT 'act_b2_' || id, id, 'Morning 10K Run', 'Run', NOW() - INTERVAL '5 days', 10.0, 3000, 3100, 80.0 FROM inserted_athletes WHERE name = 'Bhavya'
                    UNION ALL
                    SELECT 'act_b3_' || id, id, 'Recovery Run', 'Run', NOW() - INTERVAL '6 days', 3.0, 1000, 1050, 20.0 FROM inserted_athletes WHERE name = 'Bhavya'
                    UNION ALL
                    SELECT 'act_t1_' || id, id, 'Lake Swim', 'Swim', NOW() - INTERVAL '4 days', 1.5, 1200, 1200, 0.0 FROM inserted_athletes WHERE name = 'Test User';
                    """;
                jdbcTemplate.execute(sql);
                System.out.println("Dummy data inserted successfully into Railway Postgres!");
            }
        } catch (Exception e) {
            System.err.println("Error inserting dummy data: " + e.getMessage());
        }
    }
}
