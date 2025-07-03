package com.example.cart.controller;

import com.example.cart.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    private JwtUtil jwtUtil;

    public static class LoginRequest {
        public String username;
        public String password;
    }
    public static class LoginResponse {
        public String token;
        public String type = "Bearer";
        public LoginResponse(String token) { this.token = token; }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Replace with real authentication logic!
        if ("user".equals(request.username) && "password".equals(request.password)) {
            String token = jwtUtil.generateToken(request.username);
            return ResponseEntity.ok(new LoginResponse(token));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
} 