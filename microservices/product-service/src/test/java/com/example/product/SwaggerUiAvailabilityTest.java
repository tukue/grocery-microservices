package com.example.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${server.address:localhost}")
    private String host;

    @Autowired
    private TestRestTemplate restTemplate;

    private String getBaseUrl() {
        return "http://" + host + ":" + port;
    }

    @Test
    void swaggerUiShouldBeAvailable() {
        ResponseEntity<String> response = restTemplate.getForEntity(getBaseUrl() + "/swagger-ui/index.html", String.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void openApiJsonShouldBeAvailable() {
        ResponseEntity<String> response = restTemplate.getForEntity(getBaseUrl() + "/v3/api-docs", String.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }
} 