package com.geminihealth.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "challenge")
public class Challenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "activity_type")
    private String activityType;

    @Column(name = "goal_type")
    private String goalType;

    @Column(name = "target_value")
    private Double targetValue;

    private String unit;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "registration_start_date")
    private LocalDateTime registrationStartDate;

    @Column(name = "registration_end_date")
    private LocalDateTime registrationEndDate;

    private String status = "Draft"; // Draft, Scheduled, Active, Completed, Cancelled

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "banner_image")
    private String bannerImage;

    @Column(name = "is_public")
    private Boolean isPublic = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "challenge_participants",
        joinColumns = @JoinColumn(name = "challenge_id"),
        inverseJoinColumns = @JoinColumn(name = "athlete_id")
    )
    @JsonIgnoreProperties({"activities", "email", "role", "status", "createdAt", "updatedAt", "approvedAt", "approvedBy"})
    private Set<AthleteProfile> participants = new HashSet<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Challenge() {}

    public Challenge(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public String getGoalType() { return goalType; }
    public void setGoalType(String goalType) { this.goalType = goalType; }

    public Double getTargetValue() { return targetValue; }
    public void setTargetValue(Double targetValue) { this.targetValue = targetValue; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public LocalDateTime getRegistrationStartDate() { return registrationStartDate; }
    public void setRegistrationStartDate(LocalDateTime registrationStartDate) { this.registrationStartDate = registrationStartDate; }

    public LocalDateTime getRegistrationEndDate() { return registrationEndDate; }
    public void setRegistrationEndDate(LocalDateTime registrationEndDate) { this.registrationEndDate = registrationEndDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getBannerImage() { return bannerImage; }
    public void setBannerImage(String bannerImage) { this.bannerImage = bannerImage; }

    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }

    public Set<AthleteProfile> getParticipants() { return participants; }
    public void setParticipants(Set<AthleteProfile> participants) { this.participants = participants; }

    // Helper method to get participant count without exposing the full collection if not needed
    public int getParticipantCount() {
        return participants != null ? participants.size() : 0;
    }

    public void addParticipant(AthleteProfile athlete) {
        if (this.participants == null) {
            this.participants = new HashSet<>();
        }
        this.participants.add(athlete);
    }

    public void removeParticipant(AthleteProfile athlete) {
        if (this.participants != null) {
            this.participants.removeIf(a -> a.getId().equals(athlete.getId()));
        }
    }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
