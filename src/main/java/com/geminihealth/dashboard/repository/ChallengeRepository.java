package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
    List<Challenge> findByStartDateAfterOrderByStartDateAsc(LocalDateTime date);
    List<Challenge> findByStartDateLessThanEqualAndEndDateGreaterThanOrderByStartDateDesc(LocalDateTime date1, LocalDateTime date2);
}
