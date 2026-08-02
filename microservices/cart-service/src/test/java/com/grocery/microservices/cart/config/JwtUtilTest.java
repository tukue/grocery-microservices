package com.grocery.microservices.cart.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtUtilTest {

    @Test
    void rejectsBlankSecret() {
        JwtUtil jwtUtil = jwtUtilWithSecret(" ");

        assertThrows(IllegalStateException.class, jwtUtil::validateSecret);
    }

    @Test
    void rejectsShortSecret() {
        JwtUtil jwtUtil = jwtUtilWithSecret("short-secret");

        assertThrows(IllegalStateException.class, jwtUtil::validateSecret);
    }

    @Test
    void acceptsStrongSecret() {
        JwtUtil jwtUtil = jwtUtilWithSecret(UUID.randomUUID().toString());

        assertDoesNotThrow(jwtUtil::validateSecret);
    }

    private JwtUtil jwtUtilWithSecret(String secret) {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", secret);
        return jwtUtil;
    }
}
