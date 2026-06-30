package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.LogEvent;
import com.geminihealth.dashboard.service.LogCaptureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*")
public class LogController {

    @Autowired
    private LogCaptureService logCaptureService;

    @GetMapping
    public ResponseEntity<List<LogEvent>> getLogs() {
        return ResponseEntity.ok(logCaptureService.getRecentLogs());
    }
}
