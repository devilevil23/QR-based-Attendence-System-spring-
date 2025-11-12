package com.attendance.attendance_system.dto;

import java.time.LocalDateTime;

public record CheckInRecord(
        String userId,
        LocalDateTime checkInTime
) {
}
