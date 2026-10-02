package com.grocery.microservices.ledger.port;

import com.grocery.microservices.ledger.event.OrderCreatedEvent;

/**
 * Write-side port that projects order events into the ledger projection.
 * Implementations must be idempotent with respect to the event's
 * {@code eventId} so that at-least-once Kafka delivery is safe to replay.
 */
public interface LedgerProjectionUpdater {

    void process(OrderCreatedEvent event);
}
