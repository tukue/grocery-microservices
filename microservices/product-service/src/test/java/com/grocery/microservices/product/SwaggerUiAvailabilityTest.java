package com.grocery.microservices.product;

import com.grocery.microservices.product.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class SwaggerUiAvailabilityTest {

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
}