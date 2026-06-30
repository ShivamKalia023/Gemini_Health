package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.LogEvent;
import com.geminihealth.dashboard.repository.LogEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LogCaptureService {

    private static final Logger log = LoggerFactory.getLogger(LogCaptureService.class);

    @Autowired
    private LogEventRepository logEventRepository;

    @Transactional
    public void info(String message) {
        log.info(message);
        saveLog("INFO", message);
    }

    @Transactional
    public void warn(String message) {
        log.warn(message);
        saveLog("WARN", message);
    }

    @Transactional
    public void error(String message) {
        log.error(message);
        saveLog("ERROR", message);
    }

    private void saveLog(String level, String message) {
        try {
            // Truncate messages that are too long
            if (message != null && message.length() > 990) {
                message = message.substring(0, 990) + "...";
            }
            LogEvent event = new LogEvent(LocalDateTime.now(), level, message);
            logEventRepository.save(event);
            
            // Clean up logs to keep only last 500
            List<LogEvent> allLogs = logEventRepository.findAllByOrderByTimestampDesc();
            if (allLogs.size() > 500) {
                List<LogEvent> toDelete = allLogs.subList(500, allLogs.size());
                logEventRepository.deleteAll(toDelete);
            }
        } catch (Exception e) {
            // Fallback so logging failure doesn't crash the application
            System.err.println("Failed to write system log to database: " + e.getMessage());
        }
    }

    public List<LogEvent> getRecentLogs() {
        return logEventRepository.findAllByOrderByTimestampDesc();
    }
}
