package com.attendance.attendance_system.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Data
@Document(collection = "users")
public class User implements UserDetails {
    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private String section;

    private List<AttendanceRecord> attendanceRecords = new ArrayList<>();

    // ✅ Add attendance session for a new session (when admin starts one)
    public void addAttendanceSession(String sessionId, String sessionName, boolean present, LocalDateTime joinTime) {
        if (attendanceRecords == null) {
            attendanceRecords = new ArrayList<>();
        }
        attendanceRecords.add(new AttendanceRecord(sessionId, sessionName, present, joinTime));
    }

    // ✅ Mark student present for a session using token/sessionId
    public boolean markPresent(String token) {
        if (attendanceRecords == null) return false;

        for (AttendanceRecord record : attendanceRecords) {
            if (record.getSessionId().equals(token)) {
                record.setPresent(true);
                record.setJoinTime(LocalDateTime.now());
                return true;
            }
        }
        return false;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    // ✅ Inner class for individual attendance records
    @Data
    public static class AttendanceRecord {
        private String sessionId;
        private String sessionName;
        private boolean present;
        private LocalDateTime joinTime;

        public AttendanceRecord(String sessionId, String sessionName, boolean present, LocalDateTime joinTime) {
            this.sessionId = sessionId;
            this.sessionName = sessionName;
            this.present = present;
            this.joinTime = joinTime;
        }
    }
}
