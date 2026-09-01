package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedConsumer {
    private static final Logger log = LoggerFactory.getLogger(OrderCreatedConsumer.class);
    private final OrderEventProcessor processor;
    public OrderCreatedConsumer(OrderEventProcessor processor) { this.processor = processor; }

    @KafkaListener(topics = "${app.kafka.topics.order-created}", groupId = "${app.kafka.consumer-group}")
    public void consume(OrderCreatedEvent event) {
        processor.process(event);
        log.info("EVENT=ORDER_CREATED_CONSUMED EVENT_ID={} ORDER_ID={}", event.eventId(), event.orderId());
    }
}
