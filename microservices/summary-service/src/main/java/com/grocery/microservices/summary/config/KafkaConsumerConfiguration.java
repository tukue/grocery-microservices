package com.grocery.microservices.summary.config;

import org.apache.kafka.common.TopicPartition;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
@Profile("!test")
public class KafkaConsumerConfiguration {
    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfiguration.class);

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(
            KafkaTemplate<Object, Object> kafkaTemplate,
            MeterRegistry meterRegistry,
            @Value("${app.kafka.consumer.retry-delay-ms:1000}") long retryDelayMs,
            @Value("${app.kafka.consumer.maximum-retries:3}") long maximumRetries) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate, (record, exception) -> {
            String failedTopic = record.topic() + ".failed";
            meterRegistry.counter("kafka.events.failure_lettered", "topic", record.topic()).increment();
            log.error("EVENT=KAFKA_FAILURE_LETTERED TOPIC={} PARTITION={} OFFSET={} FAILED_TOPIC={} REASON={}",
                    record.topic(), record.partition(), record.offset(), failedTopic, exception.getClass().getSimpleName());
            return new TopicPartition(failedTopic, record.partition());
        });
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(retryDelayMs, maximumRetries));
        errorHandler.addNotRetryableExceptions(IllegalArgumentException.class);
        return errorHandler;
    }
}
