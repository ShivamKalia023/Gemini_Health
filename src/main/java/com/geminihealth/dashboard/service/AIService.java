package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.model.Challenge;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import com.geminihealth.dashboard.repository.ChallengeRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final ActivityRepository activityRepository;
    private final AthleteRepository athleteRepository;
    private final ChallengeRepository challengeRepository;

    public AIService(ChatClient.Builder chatClientBuilder, 
                     ActivityRepository activityRepository,
                     AthleteRepository athleteRepository,
                     ChallengeRepository challengeRepository) {
        this.chatClient = chatClientBuilder.build();
        this.activityRepository = activityRepository;
        this.athleteRepository = athleteRepository;
        this.challengeRepository = challengeRepository;
    }

    public String generateResponse(Long athleteId, String userMessage) {
        AthleteProfile athlete = athleteRepository.findById(athleteId).orElse(null);
        if (athlete == null) return "Athlete not found.";

        LocalDateTime oneMonthAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
        
        List<Activity> allActivities = activityRepository.findByAthleteIdAndStartDateAfterOrderByStartDateDesc(athleteId, oneMonthAgo);
        
        double weeklyDistance = 0;
        double monthlyDistance = 0;
        double totalCalories = 0;
        int activityCount = allActivities.size();
        
        for (Activity a : allActivities) {
            if (a.getDistance() != null) {
                monthlyDistance += a.getDistance();
                if (a.getStartDate().isAfter(oneWeekAgo)) {
                    weeklyDistance += a.getDistance();
                }
            }
            
            // Rough calorie estimation if absent
            double cals = 0;
            double weight = athlete.getWeight() != null ? athlete.getWeight() : 70.0;
            if (a.getDistance() != null && a.getDistance() > 0) {
                if (a.getType() != null && a.getType().toLowerCase().contains("run")) {
                    cals = weight * a.getDistance() * 1.03;
                } else if (a.getType() != null && a.getType().toLowerCase().contains("ride")) {
                    cals = weight * a.getDistance() * 0.28;
                } else {
                    cals = weight * a.getDistance() * 0.8;
                }
            } else if (a.getMovingTime() != null && a.getMovingTime() > 0) {
                cals = (a.getMovingTime() / 60.0) * 6.0;
            }
            
            if (a.getStartDate().isAfter(oneWeekAgo)) {
                totalCalories += cals;
            }
        }
        
        List<Challenge> allChallenges = challengeRepository.findAll();
        long activeChallenges = allChallenges.stream()
            .filter(c -> c.getParticipants() != null && c.getParticipants().stream().anyMatch(p -> p.getId().equals(athleteId)))
            .filter(c -> c.getEndDate() != null && c.getEndDate().isAfter(LocalDateTime.now()))
            .count();

        String context = String.format("""
            User Profile:
            - Name: %s
            - Weight: %s kg
            
            Statistics (Last 30 days):
            - Monthly Distance: %.2f km
            - Weekly Distance: %.2f km
            - Weekly Calories Estimated: %.0f kcal
            - Activities Count: %d
            - Active Challenges: %d
            """, 
            athlete.getName(),
            athlete.getWeight() != null ? athlete.getWeight().toString() : "Unknown",
            monthlyDistance,
            weeklyDistance,
            totalCalories,
            activityCount,
            activeChallenges
        );

        String systemPrompt = """
            You are GFG Tracker's AI Health Assistant.
            You help users understand their fitness data and provide general fitness recommendations.
            You are not a doctor.
            Never diagnose diseases.
            Never prescribe medications.
            Never provide emergency advice.
            Always recommend consulting a healthcare professional for medical concerns.
            Use the user's Strava activities, challenge participation, and statistics whenever possible.
            Be concise, helpful, encouraging, and professional.
            
            Current User Context:
            %s
            """;

        return chatClient.prompt()
            .system(String.format(systemPrompt, context))
            .user(userMessage)
            .call()
            .content();
    }
}
