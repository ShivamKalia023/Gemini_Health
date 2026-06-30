package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.LogEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogEventRepository extends JpaRepository<LogEvent, Long> {
    List<LogEvent> findAllByOrderByTimestampDesc();
}
