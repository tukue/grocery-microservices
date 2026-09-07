package com.grocery.microservices.order.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCreatedEvent(UUID eventId, String eventType, String eventVersion, Instant occurredAt,
                                String producer, Long orderId, String userId, Long cartId, double total) {
    public static final String TYPE = "OrderCreatedEvent";
    public static final String EVENT_VERSION = "1";
    public static final String PRODUCER = "order-service";

    public OrderCreatedEvent(UUID eventId, Instant occurredAt, Long orderId, String userId, Long cartId, double total) {
        this(eventId, TYPE, EVENT_VERSION, occurredAt, PRODUCER, orderId, userId, cartId, total);
    }
}
