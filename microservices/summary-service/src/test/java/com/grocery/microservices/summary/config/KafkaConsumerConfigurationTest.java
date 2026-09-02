package com.grocery.microservices.summary.config;

import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class KafkaConsumerConfigurationTest {

    @Test
    void createsBoundedRetryErrorHandler() {
        KafkaTemplate<Object, Object> kafkaTemplate = mock(KafkaTemplate.class);

        assertNotNull(new KafkaConsumerConfiguration().kafkaErrorHandler(kafkaTemplate, 1000, 3));
    }
}
