package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class OrderCreatedRetryConsumer {
    private final OrderEventProcessor processor; private final OrderEventFailurePublisher failurePublisher;
    private final MeterRegistry meterRegistry; private final int maxAttempts;
    public OrderCreatedRetryConsumer(OrderEventProcessor processor, OrderEventFailurePublisher failurePublisher,
                                   MeterRegistry meterRegistry, @Value("${app.kafka.retry.max-attempts:3}") int maxAttempts) {
        this.processor = processor; this.failurePublisher = failurePublisher; this.meterRegistry = meterRegistry; this.maxAttempts = maxAttempts;
    }
    @KafkaListener(topics = "${app.kafka.topics.order-created-retry}", groupId = "${app.kafka.consumer-group}")
    public void consume(ConsumerRecord<String, OrderCreatedEvent> record) {
        int attempt = retryAttempt(record);
        try { processor.process(record.value()); meterRegistry.counter("kafka.events.consumed", "topic", record.topic()).increment(); }
        catch (RuntimeException exception) {
            if (attempt >= maxAttempts) { failurePublisher.publishFailed(record.value(), attempt); meterRegistry.counter("kafka.events.failed", "topic", "order.created.failed.v1").increment(); }
            else { failurePublisher.publishRetry(record.value(), attempt + 1); meterRegistry.counter("kafka.events.retried", "topic", record.topic()).increment(); }
        }
    }
    private int retryAttempt(ConsumerRecord<String, OrderCreatedEvent> record) {
        var header = record.headers().lastHeader(OrderEventFailurePublisher.RETRY_ATTEMPT_HEADER);
        return header == null ? 1 : Integer.parseInt(new String(header.value(), StandardCharsets.UTF_8));
    }
}
