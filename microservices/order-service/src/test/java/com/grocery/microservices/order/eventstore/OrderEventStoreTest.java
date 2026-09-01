package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OrderEventStoreTest {

    @Test
    void persistsOrderEventAsPendingStoredRecord() throws Exception {
        StoredOrderEventRepository repository = mock(StoredOrderEventRepository.class);
        OrderEventStore service = new OrderEventStore(repository, new ObjectMapper().findAndRegisterModules());
        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(), OrderCreatedEvent.TYPE, Instant.parse("2026-01-01T00:00:00Z"), 42L, "customer-1", 7L, 19.95);

        service.enqueue(event);

        ArgumentCaptor<StoredOrderEvent> record = ArgumentCaptor.forClass(StoredOrderEvent.class);
        verify(repository).save(record.capture());
        assertEquals(event.eventId(), record.getValue().getId());
        assertEquals(StoredOrderEventStatus.PENDING, record.getValue().getStatus());
        assertEquals(event.orderId(), new ObjectMapper().findAndRegisterModules()
                .readValue(record.getValue().getPayload(), OrderCreatedEvent.class).orderId());
    }
}
