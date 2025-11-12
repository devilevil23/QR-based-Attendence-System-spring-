package com.attendance.attendance_system.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
// Renaming to SecurityConfig to reflect the file structure commonly used
public class SecurityConfig {

    /**
     * Configures the security filter chain, enabling custom CORS configuration.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors->cors.disable())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/**").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    /**
     * Defines the explicit CORS policy for the application.
     * This ensures the browser's preflight OPTIONS requests are accepted from the frontend.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 1. Explicitly allow the origin of your frontend
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173"));

    // 2. Allow necessary HTTP methods (include PUT/DELETE for student updates and admin actions)
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // 3. Allow all headers, including custom ones like "X-User-Id"
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // 4. Important: allow credentials (good practice for session/cookie usage)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply this configuration to all API paths
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
    @Bean
    public PasswordEncoder bCryptPasswordEncoder() {
        return  new BCryptPasswordEncoder();
    }
}
