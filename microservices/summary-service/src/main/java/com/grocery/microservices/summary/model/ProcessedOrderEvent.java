package com.grocery.microservices.summary.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Tracks the id of every order-created event that has already been applied to
 * the summary projection, making consumer processing idempotent on replay.
 */
@Entity
@Table(name = "processed_order_events")
public class ProcessedOrderEvent {

    @Id
    private String eventId;

    private LocalDateTime processedAt;

    public String getEventId() { return eventId; }

    public void setEventId(String eventId) { this.eventId = eventId; }

    public LocalDateTime getProcessedAt() { return processedAt; }

    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }
}