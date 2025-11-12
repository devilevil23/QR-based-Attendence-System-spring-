package com.attendance.attendance_system;

import com.attendance.attendance_system.model.User;
import com.attendance.attendance_system.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner initDatabase(UserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByEmail("riyamehta@gmail.com").isEmpty()) {
                User user = new User();
                user.setName("Riya Mehta");
                user.setEmail("riyamehta@gmail.com");
                user.setPassword(encoder.encode("12345678"));
                user.setSection("A");
                repo.save(user);
                System.out.println("Inserted default user into MongoDB");
            }
        };
    }
}