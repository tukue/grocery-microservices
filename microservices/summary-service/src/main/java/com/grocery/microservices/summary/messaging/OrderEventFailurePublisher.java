package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class OrderEventFailurePublisher {
    public static final String RETRY_ATTEMPT_HEADER = "x-retry-attempt";
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final String retryTopic;
    private final String failedLetterTopic;

    public OrderEventFailurePublisher(KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                                     @Value("${app.kafka.topics.order-created-retry}") String retryTopic,
                                     @Value("${app.kafka.topics.order-created-failed}") String failedLetterTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.retryTopic = retryTopic;
        this.failedLetterTopic = failedLetterTopic;
    }

    public void publishRetry(OrderCreatedEvent event, int attempt) {
        publish(retryTopic, event, attempt);
    }

    public void publishFailed(OrderCreatedEvent event, int attempt) {
        publish(failedLetterTopic, event, attempt);
    }

    private void publish(String topic, OrderCreatedEvent event, int attempt) {
        ProducerRecord<String, OrderCreatedEvent> record = new ProducerRecord<>(topic, null, event.orderId().toString(), event,
                new RecordHeaders().add(RETRY_ATTEMPT_HEADER, String.valueOf(attempt).getBytes(StandardCharsets.UTF_8)));
        try {
            kafkaTemplate.send(record).get();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to publish order event to " + topic, exception);
        }
    }
}
