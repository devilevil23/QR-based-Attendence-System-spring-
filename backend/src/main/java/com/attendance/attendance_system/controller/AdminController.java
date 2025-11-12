package com.attendance.attendance_system.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam; // Use Lombok's RequiredArgsConstructor
import org.springframework.web.bind.annotation.RestController;

import com.attendance.attendance_system.dto.CheckInRecord;
import com.attendance.attendance_system.dto.TokenResponse;
import com.attendance.attendance_system.model.Session;
import com.attendance.attendance_system.repository.SessionRepository;
import com.attendance.attendance_system.service.AttendanceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AttendanceService attendanceService;
    private final SessionRepository sessionRepository;

    private static final String ADMIN = "admin";

    // Lombok handles the constructor for final fields:
    // public AdminController(AttendanceService attendanceService) { this.attendanceService = attendanceService; }

    @GetMapping("/sessions")
    public ResponseEntity<List<Map<String, Object>>> getActiveSessions() {
        // NOTE: The List<Map<String, Object>> import is missing in the file you provided,
        // but Spring will handle the return type if the method exists.
        List<Map<String, Object>> sessions = attendanceService.getActiveSessions();
        return ResponseEntity.ok(sessions);
    }

    @PostMapping("/generate-token")
    public ResponseEntity<TokenResponse> generateToken(@RequestParam String section, @RequestParam String sessionName) {
        String adminId = ADMIN;

        // ✅ CRITICAL FIX: The controller now only delegates the work to the service,
        // which contains the atomic MongoDB operation.
        TokenResponse response = attendanceService.generateToken(adminId, section, sessionName);

        return ResponseEntity.ok(response);
    }

    /**
     * Return the check-in records for a specific session token.
     * Used by the admin UI to show who has checked in for a given session.
     */
    @GetMapping("/attendance/{token}")
    public ResponseEntity<List<CheckInRecord>> getAttendanceForSession(@PathVariable String token) {
        List<CheckInRecord> records = attendanceService.getCheckInRecords(token);
        return ResponseEntity.ok(records);
    }

    /**
     * Return a flattened list of all check-ins across all sessions.
     * Each element contains session info and the user check-in record.
     */
    @GetMapping("/attendance")
    public ResponseEntity<List<Map<String, Object>>> getAllAttendance() {
        List<Map<String, Object>> results = new ArrayList<>();
        List<Session> sessions = sessionRepository.findAll();
        for (Session s : sessions) {
            List<CheckInRecord> records = attendanceService.getCheckInRecords(s.getSessionToken());
            for (CheckInRecord r : records) {
                Map<String, Object> m = new HashMap<>();
                m.put("sessionToken", s.getSessionToken());
                m.put("sessionName", s.getSessionName());
                m.put("userId", r.userId());
                m.put("checkInTime", r.checkInTime());
                results.add(m);
            }
        }
        return ResponseEntity.ok(results);
    }

    @RequestMapping(value = "/generate-token", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() {
        return new ResponseEntity<>(HttpStatus.OK);
    }
}