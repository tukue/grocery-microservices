package com.grocery.microservices.summary;

import com.grocery.microservices.summary.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.kafka.topics.order-created=order.created.v1",
                "app.kafka.consumer-group=summary-service",
                "spring.kafka.listener.auto-startup=false"
        })
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@AutoConfigureTestRestTemplate
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
