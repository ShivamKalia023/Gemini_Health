package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.RuntimeMXBean;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "*")
public class HealthController {

    @Autowired
    private AthleteRepository athleteRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // 1. Check Database status
        boolean dbAlive = false;
        try {
            athleteRepository.count(); // Simple JPA query to verify connection
            dbAlive = true;
        } catch (Exception e) {
            // Logged inside service if needed
        }
        health.put("databaseConnected", dbAlive);

        // 2. JVM & OS Metrics
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        Map<String, Object> jvm = new HashMap<>();
        jvm.put("maxMemoryMb", maxMemory / (1024 * 1024));
        jvm.put("totalMemoryMb", totalMemory / (1024 * 1024));
        jvm.put("usedMemoryMb", usedMemory / (1024 * 1024));
        jvm.put("freeMemoryMb", freeMemory / (1024 * 1024));
        jvm.put("availableProcessors", runtime.availableProcessors());

        // Thread count
        int activeThreads = Thread.activeCount();
        jvm.put("activeThreads", activeThreads);

        // Uptime
        RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();
        jvm.put("uptimeMs", runtimeMXBean.getUptime());

        health.put("jvm", jvm);

        // 3. Disk Space Metrics
        File root = new File(".");
        long totalSpace = root.getTotalSpace();
        long freeSpace = root.getFreeSpace();
        long usableSpace = root.getUsableSpace();

        Map<String, Object> disk = new HashMap<>();
        disk.put("totalSpaceGb", totalSpace / (1024 * 1024 * 1024));
        disk.put("freeSpaceGb", freeSpace / (1024 * 1024 * 1024));
        disk.put("usableSpaceGb", usableSpace / (1024 * 1024 * 1024));
        health.put("disk", disk);

        // 4. System overall status
        health.put("status", (dbAlive && usableSpace > 50 * 1024 * 1024) ? "UP" : "DOWN");

        return ResponseEntity.ok(health);
    }
}
