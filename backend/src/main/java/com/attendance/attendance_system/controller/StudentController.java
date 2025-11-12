package com.attendance.attendance_system.controller;

import com.attendance.attendance_system.dto.SectionData;
import com.attendance.attendance_system.model.User;
import com.attendance.attendance_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "http://localhost:5173")
public class StudentController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/sections")
    public List<SectionData> getStudentsGroupedBySection() {
        List<User> allUsers = userRepository.findAll();

        Map<String, List<User>> groupedBySection = allUsers.stream()
                .collect(Collectors.groupingBy(User::getSection));

        return groupedBySection.entrySet().stream()
                .map(entry -> new SectionData(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(SectionData::getSection))
                .collect(Collectors.toList());
    }

    @PutMapping("/assign/{userId}")
    public ResponseEntity<User> updateStudentSection(@PathVariable String userId, @RequestBody Map<String, String> payload) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String newSection = payload.get("newSection");
        if (newSection == null || newSection.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User user = userOptional.get();
        user.setSection(newSection);
        return ResponseEntity.ok(userRepository.save(user));
    }
    @PostMapping("/check-in")
    public ResponseEntity<String> markStudentPresent(@RequestParam String userId, @RequestParam String token) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        User user = optionalUser.get();
        boolean updated = user.markPresent(token);

        if (!updated) {
            return ResponseEntity.badRequest().body("Session not found for this token");
        }

        userRepository.save(user);
        return ResponseEntity.ok("Attendance marked as present");
    }

}
