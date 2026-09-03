package com.grocery.microservices.summary.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCreatedEvent(UUID eventId, String eventType, Instant occurredAt,
                                Long orderId, String userId, Long cartId, double total,
                                Integer eventVersion, UUID correlationId, String aggregateId,
                                OrderCreatedPayload payload) {
}
