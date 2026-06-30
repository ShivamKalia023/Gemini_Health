package com.geminihealth.dashboard.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "athlete_profile")
public class AthleteProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "strava_id", unique = true)
    private String stravaId;

    private String name;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String city;
    private String state;
    private String country;

    @Column(name = "primary_sport")
    private String primarySport;

    @Column(name = "weekly_distance_goal")
    private Double weeklyDistanceGoal; // in km

    private Integer ftp; // Functional Threshold Power (Watts)

    @Column(name = "resting_hr")
    private Integer restingHr = 60; // resting Heart Rate (bpm)

    @Column(name = "max_hr")
    private Integer maxHr = 190; // maximum Heart Rate (bpm)

    private Double weight; // in kg

    @OneToMany(mappedBy = "athlete", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Activity> activities = new ArrayList<>();

    // Constructors
    public AthleteProfile() {}

    public AthleteProfile(String stravaId, String name, String avatarUrl, String city, String state, String country, String primarySport, Double weeklyDistanceGoal, Integer ftp, Integer restingHr, Integer maxHr, Double weight) {
        this.stravaId = stravaId;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.city = city;
        this.state = state;
        this.country = country;
        this.primarySport = primarySport;
        this.weeklyDistanceGoal = weeklyDistanceGoal;
        this.ftp = ftp;
        this.restingHr = restingHr != null ? restingHr : 60;
        this.maxHr = maxHr != null ? maxHr : 190;
        this.weight = weight;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStravaId() {
        return stravaId;
    }

    public void setStravaId(String stravaId) {
        this.stravaId = stravaId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getPrimarySport() {
        return primarySport;
    }

    public void setPrimarySport(String primarySport) {
        this.primarySport = primarySport;
    }

    public Double getWeeklyDistanceGoal() {
        return weeklyDistanceGoal;
    }

    public void setWeeklyDistanceGoal(Double weeklyDistanceGoal) {
        this.weeklyDistanceGoal = weeklyDistanceGoal;
    }

    public Integer getFtp() {
        return ftp;
    }

    public void setFtp(Integer ftp) {
        this.ftp = ftp;
    }

    public Integer getRestingHr() {
        return restingHr;
    }

    public void setRestingHr(Integer restingHr) {
        this.restingHr = restingHr != null ? restingHr : 60;
    }

    public Integer getMaxHr() {
        return maxHr;
    }

    public void setMaxHr(Integer maxHr) {
        this.maxHr = maxHr != null ? maxHr : 190;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public List<Activity> getActivities() {
        return activities;
    }

    public void setActivities(List<Activity> activities) {
        this.activities = activities;
    }
}
