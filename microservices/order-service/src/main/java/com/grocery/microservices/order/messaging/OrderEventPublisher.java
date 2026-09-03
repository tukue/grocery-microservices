package com.grocery.microservices.order.messaging;

import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

@Component
public class OrderEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final String topic;

    public OrderEventPublisher(KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                               @Value("${app.kafka.topics.order-created}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publish(OrderCreatedEvent event) {
        kafkaTemplate.send(MessageBuilder.withPayload(event)
                        .setHeader(org.springframework.kafka.support.KafkaHeaders.TOPIC, topic)
                        .setHeader(org.springframework.kafka.support.KafkaHeaders.KEY, event.orderId().toString())
                        .setHeader("correlationId", event.correlationId().toString())
                        .build())
                .whenComplete((result, exception) -> logPublishResult(event, result, exception));
    }

    private void logPublishResult(OrderCreatedEvent event, SendResult<String, OrderCreatedEvent> result, Throwable exception) {
        if (exception != null) {
            log.error("EVENT=ORDER_CREATED_PUBLISH_FAILED EVENT_ID={} ORDER_ID={} CORRELATION_ID={} TOPIC={}",
                    event.eventId(), event.orderId(), event.correlationId(), topic, exception);
            return;
        }
        log.info("EVENT=ORDER_CREATED_PUBLISHED EVENT_ID={} ORDER_ID={} CORRELATION_ID={} TOPIC={} PARTITION={} OFFSET={}",
                event.eventId(), event.orderId(), event.correlationId(), topic,
                result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
    }
}
