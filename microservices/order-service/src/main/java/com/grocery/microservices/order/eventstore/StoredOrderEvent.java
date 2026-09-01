package com.grocery.microservices.order.eventstore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_event_store", indexes = {
        @Index(name = "idx_order_event_store_status_created", columnList = "status,created_at")
})
public class StoredOrderEvent {
    @Id
    private UUID id;
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;
    @Column(name = "aggregate_id", nullable = false)
    private Long aggregateId;
    @Column(nullable = false, columnDefinition = "text")
    private String payload;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StoredOrderEventStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "last_error", length = 500)
    private String lastError;

    protected StoredOrderEvent() {
    }

    public StoredOrderEvent(UUID id, String eventType, Long aggregateId, String payload) {
        this.id = id;
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.payload = payload;
        this.status = StoredOrderEventStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getPayload() { return payload; }
    public StoredOrderEventStatus getStatus() { return status; }

    public void markPublished() {
        status = StoredOrderEventStatus.PUBLISHED;
        publishedAt = Instant.now();
        lastError = null;
    }

    public void recordFailure(Exception exception) {
        attempts++;
        lastError = exception.getClass().getSimpleName();
    }
}
