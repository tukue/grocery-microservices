package com.grocery.microservices.summary.port;

import com.grocery.microservices.summary.event.OrderCreatedEvent;

/**
 * Write-side port that projects order events into the summary projection.
 * Implementations must be idempotent with respect to the event's
 * {@code eventId} so that at-least-once Kafka delivery is safe to replay.
 */
public interface SummaryProjectionUpdater {

    void process(OrderCreatedEvent event);
}