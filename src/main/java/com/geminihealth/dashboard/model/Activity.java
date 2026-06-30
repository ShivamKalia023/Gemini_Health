package com.geminihealth.dashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "strava_activity_id")
    private String stravaActivityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "athlete_id", nullable = false)
    @JsonIgnore
    private AthleteProfile athlete;

    private String name;
    private String type; // Run, Ride, Swim, Gym, Hike, etc.

    @Column(name = "start_date")
    private LocalDateTime startDate;

    private Double distance; // in km
    
    @Column(name = "moving_time")
    private Integer movingTime; // in seconds

    @Column(name = "elapsed_time")
    private Integer elapsedTime; // in seconds

    @Column(name = "total_elevation_gain")
    private Double totalElevationGain; // in meters

    @Column(name = "average_hr")
    private Integer averageHr; // bpm

    @Column(name = "max_hr")
    private Integer maxHr; // bpm

    @Column(name = "average_speed")
    private Double averageSpeed; // km/h

    @Column(name = "average_watts")
    private Double averageWatts; // Watts (cycling)

    private Integer trimp; // Training Impulse stress score

    @Lob
    @Column(name = "stream_json", length = 1000000)
    private String streamJson; // CLOB for storing high-res sensor points

    // Constructors
    public Activity() {}

    public Activity(String stravaActivityId, AthleteProfile athlete, String name, String type, LocalDateTime startDate, Double distance, Integer movingTime, Integer elapsedTime, Double totalElevationGain, Integer averageHr, Integer maxHr, Double averageSpeed, Double averageWatts, Integer trimp, String streamJson) {
        this.stravaActivityId = stravaActivityId;
        this.athlete = athlete;
        this.name = name;
        this.type = type;
        this.startDate = startDate;
        this.distance = distance;
        this.movingTime = movingTime;
        this.elapsedTime = elapsedTime;
        this.totalElevationGain = totalElevationGain;
        this.averageHr = averageHr;
        this.maxHr = maxHr;
        this.averageSpeed = averageSpeed;
        this.averageWatts = averageWatts;
        this.trimp = trimp;
        this.streamJson = streamJson;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStravaActivityId() {
        return stravaActivityId;
    }

    public void setStravaActivityId(String stravaActivityId) {
        this.stravaActivityId = stravaActivityId;
    }

    public AthleteProfile getAthlete() {
        return athlete;
    }

    public void setAthlete(AthleteProfile athlete) {
        this.athlete = athlete;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public Double getDistance() {
        return distance;
    }

    public void setDistance(Double distance) {
        this.distance = distance;
    }

    public Integer getMovingTime() {
        return movingTime;
    }

    public void setMovingTime(Integer movingTime) {
        this.movingTime = movingTime;
    }

    public Integer getElapsedTime() {
        return elapsedTime;
    }

    public void setElapsedTime(Integer elapsedTime) {
        this.elapsedTime = elapsedTime;
    }

    public Double getTotalElevationGain() {
        return totalElevationGain;
    }

    public void setTotalElevationGain(Double totalElevationGain) {
        this.totalElevationGain = totalElevationGain;
    }

    public Integer getAverageHr() {
        return averageHr;
    }

    public void setAverageHr(Integer averageHr) {
        this.averageHr = averageHr;
    }

    public Integer getMaxHr() {
        return maxHr;
    }

    public void setMaxHr(Integer maxHr) {
        this.maxHr = maxHr;
    }

    public Double getAverageSpeed() {
        return averageSpeed;
    }

    public void setAverageSpeed(Double averageSpeed) {
        this.averageSpeed = averageSpeed;
    }

    public Double getAverageWatts() {
        return averageWatts;
    }

    public void setAverageWatts(Double averageWatts) {
        this.averageWatts = averageWatts;
    }

    public Integer getTrimp() {
        return trimp;
    }

    public void setTrimp(Integer trimp) {
        this.trimp = trimp;
    }

    public String getStreamJson() {
        return streamJson;
    }

    public void setStreamJson(String streamJson) {
        this.streamJson = streamJson;
    }
}
