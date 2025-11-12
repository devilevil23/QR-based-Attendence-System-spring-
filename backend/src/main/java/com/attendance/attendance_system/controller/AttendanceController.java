package com.attendance.attendance_system.controller;

import com.attendance.attendance_system.dto.AttendanceResponse;
import com.attendance.attendance_system.dto.TokenRequest;
import com.attendance.attendance_system.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "http://localhost:5173")
public class AttendanceController {

    private final AttendanceService attendanceService;

    private static final String SIMULATED_USER_HEADER = "X-User-Id";
    private static final String UNAUTHORIZED_USER = "unauthenticated";

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceResponse> checkIn(
            @RequestHeader(value = SIMULATED_USER_HEADER, required = false) String userIdHeader,
            @RequestBody TokenRequest request) {

        String userId = (userIdHeader != null && !userIdHeader.isEmpty()) ? userIdHeader : UNAUTHORIZED_USER;

        if (UNAUTHORIZED_USER.equals(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AttendanceResponse("User must be logged in to check attendance.", HttpStatus.UNAUTHORIZED));
        }

        AttendanceResponse result = attendanceService.checkIn(request.token(), userId);
        return ResponseEntity.status(result.status()).body(result);
    }

    @RequestMapping(value = "/check-in", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptionsCheckIn() {
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
