package com.example.cart;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.boot.test.mock.mockito.MockBean;
import com.example.cart.config.JwtRequestFilter;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@ImportAutoConfiguration(exclude = com.example.cart.config.SecurityConfig.class)
class SwaggerUiAvailabilityTest {
    @MockBean
    private JwtRequestFilter jwtRequestFilter;

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void swaggerUiShouldBeAvailable() {
        ResponseEntity<byte[]> response = restTemplate.getForEntity("http://localhost:" + port + "/swagger-ui/index.html", byte[].class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void openApiJsonShouldBeAvailable() {
        ResponseEntity<byte[]> response = restTemplate.getForEntity("http://localhost:" + port + "/v3/api-docs", byte[].class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(authz -> authz.anyRequest().permitAll());
            return http.build();
        }
    }
} 