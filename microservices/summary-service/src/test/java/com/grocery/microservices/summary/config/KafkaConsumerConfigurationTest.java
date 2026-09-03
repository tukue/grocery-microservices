package com.grocery.microservices.summary.config;

import org.junit.jupiter.api.Test;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.kafka.core.KafkaTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class KafkaConsumerConfigurationTest {

    @Test
    void createsBoundedRetryErrorHandler() {
        KafkaTemplate<Object, Object> kafkaTemplate = mock(KafkaTemplate.class);

        assertNotNull(new KafkaConsumerConfiguration().kafkaErrorHandler(
                kafkaTemplate, new SimpleMeterRegistry(), 1000, 3));
    }
}
