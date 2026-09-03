package com.grocery.microservices.order.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCreatedEvent(UUID eventId, String eventType, Instant occurredAt,
                                Long orderId, String userId, Long cartId, double total,
                                Integer eventVersion, UUID correlationId, String aggregateId,
                                OrderCreatedPayload payload) {
    public static final String TYPE = "order.created";
    public static final int VERSION = 1;

    public static OrderCreatedEvent create(UUID eventId, UUID correlationId, Instant occurredAt,
                                           Long orderId, String userId, Long cartId, double total) {
        return new OrderCreatedEvent(eventId, TYPE, occurredAt, orderId, userId, cartId, total,
                VERSION, correlationId, "order:" + orderId,
                new OrderCreatedPayload(orderId, userId, cartId, total));
    }
}
