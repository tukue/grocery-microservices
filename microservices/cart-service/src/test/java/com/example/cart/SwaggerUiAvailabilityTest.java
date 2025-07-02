package com.example.cart;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SwaggerUiAvailabilityTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void swaggerUiShouldBeAvailable() {
        ResponseEntity<String> response = restTemplate.getForEntity("http://localhost:" + port + "/swagger-ui/index.html", String.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("Swagger UI");
    }

    @Test
    void openApiJsonShouldBeAvailable() {
        ResponseEntity<String> response = restTemplate.getForEntity("http://localhost:" + port + "/v3/api-docs", String.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("openapi");
    }
} 