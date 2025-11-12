package com.attendance.attendance_system.dto;

import org.springframework.http.HttpStatus;

public record AttendanceResponse(String message, HttpStatus status) {
}

