package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AthleteRepository athleteRepository;

    @GetMapping("/users/{status}")
    public ResponseEntity<List<AthleteProfile>> getUsersByStatus(@PathVariable String status) {
        try {
            AthleteProfile.Status parsedStatus = AthleteProfile.Status.valueOf(status.toUpperCase());
            List<AthleteProfile> athletes = athleteRepository.findAll().stream()
                    .filter(a -> a.getStatus() == parsedStatus)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(athletes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/users/{id}/approve")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        return athleteRepository.findById(id).map(athlete -> {
            athlete.setStatus(AthleteProfile.Status.APPROVED);
            athlete.setApprovedAt(LocalDateTime.now());
            // Optionally, store the admin who approved it if we track sessions fully
            athlete.setApprovedBy("System Admin");
            athleteRepository.save(athlete);
            return ResponseEntity.ok(Map.of("message", "User approved successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectUser(@PathVariable Long id) {
        return athleteRepository.findById(id).map(athlete -> {
            athlete.setStatus(AthleteProfile.Status.REJECTED);
            athleteRepository.save(athlete);
            return ResponseEntity.ok(Map.of("message", "User rejected successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/revoke")
    public ResponseEntity<?> revokeUser(@PathVariable Long id) {
        return athleteRepository.findById(id).map(athlete -> {
            athlete.setStatus(AthleteProfile.Status.PENDING);
            athleteRepository.save(athlete);
            return ResponseEntity.ok(Map.of("message", "User access revoked (Pending)"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return athleteRepository.findById(id).map(athlete -> {
            athleteRepository.delete(athlete);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        List<AthleteProfile> all = athleteRepository.findAll();
        long pending = all.stream().filter(a -> a.getStatus() == AthleteProfile.Status.PENDING).count();
        long approved = all.stream().filter(a -> a.getStatus() == AthleteProfile.Status.APPROVED).count();
        long rejected = all.stream().filter(a -> a.getStatus() == AthleteProfile.Status.REJECTED).count();
        long total = all.size();

        return ResponseEntity.ok(Map.of(
                "totalUsers", total,
                "pendingUsers", pending,
                "approvedUsers", approved,
                "rejectedUsers", rejected
        ));
    }
}
