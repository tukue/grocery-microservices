package com.grocery.microservices.order.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OrderOutboxServiceTest {

    @Test
    void persistsOrderEventAsPendingOutboxRecord() throws Exception {
        OutboxEventRepository repository = mock(OutboxEventRepository.class);
        OrderOutboxService service = new OrderOutboxService(repository, new ObjectMapper().findAndRegisterModules());
        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(), OrderCreatedEvent.TYPE, Instant.parse("2026-01-01T00:00:00Z"), 42L, "customer-1", 7L, 19.95);

        service.enqueue(event);

        ArgumentCaptor<OutboxEvent> record = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(repository).save(record.capture());
        assertEquals(event.eventId(), record.getValue().getId());
        assertEquals(OutboxEventStatus.PENDING, record.getValue().getStatus());
        assertEquals(event.orderId(), new ObjectMapper().findAndRegisterModules()
                .readValue(record.getValue().getPayload(), OrderCreatedEvent.class).orderId());
    }
}
