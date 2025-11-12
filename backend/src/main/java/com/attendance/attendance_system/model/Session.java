package com.attendance.attendance_system.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "sessions")
public class Session {
    @Id
    private String id;                // MongoDB ID (auto-generated)
    private String sessionToken;      // Token shared with students
    private String sessionName;       // "Math Class - 5 Nov"
    private String section;           // e.g. "A"
    private String createdBy;         // Admin ID or name
    private LocalDateTime createdAt;  // When session started
    private LocalDateTime expiresAt;  // Expiration time
    private boolean active;           // Whether still valid
}
