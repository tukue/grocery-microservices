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
    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;
    @Column(name = "lease_until")
    private Instant leaseUntil;
    @Column(nullable = false)
    private int attempts = 0;
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
        this.nextAttemptAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getPayload() { return payload; }
    public StoredOrderEventStatus getStatus() { return status; }
    public int getAttempts() { return attempts; }

    public void claim(Instant leaseExpiry) {
        status = StoredOrderEventStatus.PROCESSING;
        leaseUntil = leaseExpiry;
    }

    public void markPublished() {
        if (status != StoredOrderEventStatus.PROCESSING) {
            return;
        }
        status = StoredOrderEventStatus.PUBLISHED;
        publishedAt = Instant.now();
        leaseUntil = null;
        lastError = null;
    }

    public void recordFailure(Throwable exception, Instant nextRetryAt, int maximumRetries) {
        if (status != StoredOrderEventStatus.PROCESSING) {
            return;
        }
        attempts++;
        lastError = exception.getClass().getSimpleName();
        leaseUntil = null;
        if (attempts > maximumRetries) {
            status = StoredOrderEventStatus.FAILED;
            return;
        }
        status = StoredOrderEventStatus.PENDING;
        nextAttemptAt = nextRetryAt;
    }
}
