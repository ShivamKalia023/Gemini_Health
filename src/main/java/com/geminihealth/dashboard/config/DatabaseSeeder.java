package com.geminihealth.dashboard.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Paths;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            System.out.println("Checking if database needs seeding...");
            try {
                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM athlete_profile", Integer.class);
                if (count != null && count > 0) {
                    System.out.println("Database already contains data. Skipping database wipe and seed.");
                    return;
                }
                
                System.out.println("Seeding database with test users and activities...");
                // Note: DELETE statements have been removed to prevent accidental data loss.
                
                // Execute dummy_data.sql
                try {
                    String sql = Files.readString(Paths.get("dummy_data.sql"));
                    jdbcTemplate.execute(sql);
                    System.out.println("Executed dummy_data.sql successfully.");
                } catch (Exception e) {
                    System.err.println("Error executing dummy_data.sql: " + e.getMessage());
                }
                System.out.println("Test users seeded successfully.");
            } catch (Exception e) {
                System.err.println("Error seeding database: " + e.getMessage());
                e.printStackTrace();
            }
        };
    }
}
