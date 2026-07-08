package com.geminihealth.dashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "like_record", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"post_id", "athlete_id"})
})
public class LikeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    @JsonIgnoreProperties({"athlete", "activity", "caption", "createdAt"})
    private Post post;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "athlete_id", nullable = false)
    @JsonIgnoreProperties("activities")
    private AthleteProfile athlete;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public LikeRecord() {}

    public LikeRecord(Post post, AthleteProfile athlete) {
        this.post = post;
        this.athlete = athlete;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Post getPost() {
        return post;
    }

    public void setPost(Post post) {
        this.post = post;
    }

    public AthleteProfile getAthlete() {
        return athlete;
    }

    public void setAthlete(AthleteProfile athlete) {
        this.athlete = athlete;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
