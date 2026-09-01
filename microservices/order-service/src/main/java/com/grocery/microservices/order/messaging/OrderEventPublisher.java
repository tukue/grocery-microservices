package com.grocery.microservices.order.messaging;

import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(OrderCreatedEvent event) {
        kafkaTemplate.send(topic, event.orderId().toString(), event)
                .whenComplete((result, failure) -> {
                    if (failure == null) {
                        log.info("EVENT=ORDER_CREATED_PUBLISHED EVENT_ID={} ORDER_ID={} TOPIC={}",
                                event.eventId(), event.orderId(), topic);
                    } else {
                        log.error("EVENT=ORDER_CREATED_PUBLISH_FAILED EVENT_ID={} ORDER_ID={} TOPIC={}",
                                event.eventId(), event.orderId(), topic, failure);
                    }
                });
    }
}
