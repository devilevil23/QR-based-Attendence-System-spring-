package com.attendance.attendance_system.dto;


public record TokenResponse(String token, long expiresInMinutes) {
}
