package com.grocery.microservices.order.outbox;

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
@Table(name = "outbox_events", indexes = {
        @Index(name = "idx_outbox_status_created", columnList = "status,created_at")
})
public class OutboxEvent {
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
    private OutboxEventStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "last_error", length = 500)
    private String lastError;

    protected OutboxEvent() {
    }

    public OutboxEvent(UUID id, String eventType, Long aggregateId, String payload) {
        this.id = id;
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.payload = payload;
        this.status = OutboxEventStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getPayload() { return payload; }
    public OutboxEventStatus getStatus() { return status; }

    public void markPublished() {
        status = OutboxEventStatus.PUBLISHED;
        publishedAt = Instant.now();
        lastError = null;
    }

    public void recordFailure(Exception exception) {
        attempts++;
        lastError = exception.getClass().getSimpleName();
    }
}
