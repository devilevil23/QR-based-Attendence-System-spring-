package com.attendance.attendance_system.repository;

import com.attendance.attendance_system.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends MongoRepository<Session, String> {
    Optional<Session> findBySessionToken(String sessionToken);
    List<Session> findBySection(String section);
    List<Session> findByCreatedBy(String createdBy);
}
