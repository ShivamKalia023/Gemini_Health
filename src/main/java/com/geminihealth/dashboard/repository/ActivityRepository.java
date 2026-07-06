package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByAthleteIdOrderByStartDateDesc(Long athleteId);
    List<Activity> findByAthleteIdAndStartDateAfterOrderByStartDateAsc(Long athleteId, LocalDateTime startDate);
    Optional<Activity> findByStravaActivityId(String stravaActivityId);
    List<Activity> findByAthleteIdAndStartDateBetween(Long athleteId, LocalDateTime start, LocalDateTime end);
    
    List<Activity> findTop50ByOrderByStartDateDesc();
}
