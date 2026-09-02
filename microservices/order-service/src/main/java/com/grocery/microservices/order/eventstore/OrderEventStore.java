package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderEventStore {
    private final StoredOrderEventRepository repository;
    private final ObjectMapper objectMapper;
    private final int batchSize;
    private final int maximumRetries;
    private final Duration leaseDuration;
    private final Duration retryDelay;

    public OrderEventStore(StoredOrderEventRepository repository, ObjectMapper objectMapper,
                           @Value("${app.kafka.event-store.batch-size:100}") int batchSize,
                           @Value("${app.kafka.event-store.maximum-retries:10}") int maximumRetries,
                           @Value("${app.kafka.event-store.lease-duration:PT30S}") Duration leaseDuration,
                           @Value("${app.kafka.event-store.retry-delay:PT5S}") Duration retryDelay) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.batchSize = batchSize;
        this.maximumRetries = maximumRetries;
        this.leaseDuration = leaseDuration;
        this.retryDelay = retryDelay;
    }

    public void enqueue(OrderCreatedEvent event) {
        try {
            repository.save(new StoredOrderEvent(
                    event.eventId(), event.eventType(), event.orderId(), objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize order event for storage", exception);
        }
    }

    @Transactional
    public List<StoredOrderEventDelivery> claimProcessableEvents() {
        Instant now = Instant.now();
        return repository.findProcessableEvents(
                        StoredOrderEventStatus.PENDING,
                        StoredOrderEventStatus.PROCESSING,
                        now,
                        PageRequest.of(0, batchSize))
                .stream()
                .map(event -> {
                    event.claim(now.plus(leaseDuration));
                    return new StoredOrderEventDelivery(event.getId(), event.getPayload());
                })
                .toList();
    }

    @Transactional
    public void markPublished(UUID eventId) {
        repository.findById(eventId).ifPresent(StoredOrderEvent::markPublished);
    }

    @Transactional
    public void recordDeliveryFailure(UUID eventId, Throwable exception) {
        repository.findById(eventId).ifPresent(event ->
                event.recordFailure(exception, Instant.now().plus(retryDelay), maximumRetries));
    }
}
