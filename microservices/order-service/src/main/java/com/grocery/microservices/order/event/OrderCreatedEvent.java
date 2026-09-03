package com.grocery.microservices.order.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCreatedEvent(UUID eventId, String eventType, Instant occurredAt,
                                Long orderId, String userId, Long cartId, double total) {
    public static final String TYPE = "OrderCreatedEvent";
}
