package com.attendance.attendance_system.controller;


import com.attendance.attendance_system.model.User;
import com.attendance.attendance_system.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    @Autowired
    private UserRepository repo;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/signup")
    public User signup(@RequestBody User user) {
        if (repo.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use.");
        }
        user.setSection("A");
        return repo.save(user);
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody User loginUser) {
        Optional<User> foundUser = repo.findByEmail(loginUser.getEmail());

        if (foundUser.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        User user = foundUser.get();

        if (passwordEncoder.matches(loginUser.getPassword(), user.getPassword())) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).build();
        }
    }
}