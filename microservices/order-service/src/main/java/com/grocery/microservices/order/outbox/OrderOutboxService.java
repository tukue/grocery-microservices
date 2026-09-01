package com.grocery.microservices.order.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.springframework.stereotype.Service;

@Service
public class OrderOutboxService {
    private final OutboxEventRepository repository;
    private final ObjectMapper objectMapper;

    public OrderOutboxService(OutboxEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void enqueue(OrderCreatedEvent event) {
        try {
            repository.save(new OutboxEvent(
                    event.eventId(), event.eventType(), event.orderId(), objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize order event for the outbox", exception);
        }
    }
}
