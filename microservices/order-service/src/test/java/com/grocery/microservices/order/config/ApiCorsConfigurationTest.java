package com.grocery.microservices.order.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ApiCorsConfigurationTest {

    @Test
    void allowsOnlyConfiguredFrontendOrigins() {
        SecurityConfig securityConfig = new SecurityConfig(null, null,
                "https://app.example.com, https://admin.example.com");

        CorsConfiguration configuration = securityConfig.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest());

        assertEquals(List.of("https://app.example.com", "https://admin.example.com"),
                configuration.getAllowedOrigins());
        assertEquals(List.of("Authorization", "Content-Type", "X-Correlation-Id"),
                configuration.getAllowedHeaders());
        assertFalse(configuration.getAllowCredentials());
    }

    @Test
    void rejectsMissingFrontendOrigins() {
        assertThrows(IllegalStateException.class, () -> new SecurityConfig(null, null, " "));
    }
}
