package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.springframework.stereotype.Service;

@Service
public class OrderEventStore {
    private final StoredOrderEventRepository repository;
    private final ObjectMapper objectMapper;

    public OrderEventStore(StoredOrderEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void enqueue(OrderCreatedEvent event) {
        try {
            repository.save(new StoredOrderEvent(
                    event.eventId(), event.eventType(), event.orderId(), objectMapper.writeValueAsString(event)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize order event for storage", exception);
        }
    }
}
