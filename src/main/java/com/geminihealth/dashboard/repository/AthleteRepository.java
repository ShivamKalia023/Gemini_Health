package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.AthleteProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AthleteRepository extends JpaRepository<AthleteProfile, Long> {
    Optional<AthleteProfile> findByStravaId(String stravaId);
    Optional<AthleteProfile> findByName(String name);
}
