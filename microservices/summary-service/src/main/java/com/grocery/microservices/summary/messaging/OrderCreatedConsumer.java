package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.beans.factory.annotation.Value;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedConsumer {
    private static final Logger log = LoggerFactory.getLogger(OrderCreatedConsumer.class);
    private final OrderEventProcessor processor;
    private final OrderEventFailurePublisher failurePublisher;
    private final MeterRegistry meterRegistry;
    private final int localAttempts;
    public OrderCreatedConsumer(OrderEventProcessor processor, OrderEventFailurePublisher failurePublisher,
                                MeterRegistry meterRegistry,
                                @Value("${app.kafka.retry.local-attempts:3}") int localAttempts) {
        this.processor = processor; this.failurePublisher = failurePublisher;
        this.meterRegistry = meterRegistry; this.localAttempts = localAttempts;
    }

    @KafkaListener(topics = "${app.kafka.topics.order-created}", groupId = "${app.kafka.consumer-group}")
    public void consume(OrderCreatedEvent event) {
        try {
            retryTemplate().execute(context -> { processor.process(event); return null; });
            meterRegistry.counter("kafka.events.consumed", "topic", "order.created.v1").increment();
            log.info("EVENT=ORDER_CREATED_CONSUMED EVENT_ID={} CORRELATION_ID={} ORDER_ID={}", event.eventId(), event.correlationId(), event.orderId());
        } catch (IllegalArgumentException exception) {
            failurePublisher.publishFailed(event, 0);
            meterRegistry.counter("kafka.events.failed", "topic", "order.created.failed.v1").increment();
            log.warn("EVENT=ORDER_CREATED_INVALID EVENT_ID={} ORDER_ID={}", event.eventId(), event.orderId());
        } catch (RuntimeException exception) {
            failurePublisher.publishRetry(event, 1);
            meterRegistry.counter("kafka.events.retried", "topic", "order.created.retry.v1").increment();
            log.warn("EVENT=ORDER_CREATED_RETRY_SCHEDULED EVENT_ID={} ORDER_ID={} RETRY_ATTEMPT=1", event.eventId(), event.orderId());
        }
    }

    private RetryTemplate retryTemplate() {
        ExponentialBackOffPolicy backoff = new ExponentialBackOffPolicy(); backoff.setInitialInterval(100); backoff.setMultiplier(2); backoff.setMaxInterval(1000);
        RetryTemplate retryTemplate = new RetryTemplate(); retryTemplate.setRetryPolicy(new SimpleRetryPolicy(localAttempts)); retryTemplate.setBackOffPolicy(backoff); return retryTemplate;
    }
}
