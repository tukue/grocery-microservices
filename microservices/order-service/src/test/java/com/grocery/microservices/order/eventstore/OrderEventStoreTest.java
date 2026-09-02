package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class OrderEventStoreTest {

    @Test
    void persistsOrderEventAsPendingStoredRecord() throws Exception {
        StoredOrderEventRepository repository = mock(StoredOrderEventRepository.class);
        OrderEventStore service = newEventStore(repository);
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

    @Test
    void claimsPendingEventsBeforePublishing() {
        StoredOrderEventRepository repository = mock(StoredOrderEventRepository.class);
        StoredOrderEvent event = new StoredOrderEvent(UUID.randomUUID(), OrderCreatedEvent.TYPE, 42L, "{}");
        when(repository.findProcessableEvents(eq(StoredOrderEventStatus.PENDING), eq(StoredOrderEventStatus.PROCESSING),
                any(Instant.class), any())).thenReturn(List.of(event));

        List<StoredOrderEventDelivery> deliveries = newEventStore(repository).claimProcessableEvents();

        assertEquals(1, deliveries.size());
        assertEquals(event.getId(), deliveries.getFirst().id());
        assertEquals(StoredOrderEventStatus.PROCESSING, event.getStatus());
    }

    @Test
    void marksEventAsTerminalAfterMaximumDeliveryFailures() {
        StoredOrderEvent event = new StoredOrderEvent(UUID.randomUUID(), OrderCreatedEvent.TYPE, 42L, "{}");
        event.claim(Instant.now().plusSeconds(30));

        event.recordFailure(new IllegalStateException(), Instant.now().plusSeconds(5), 1);

        assertEquals(StoredOrderEventStatus.FAILED, event.getStatus());
        assertEquals(1, event.getAttempts());
    }

    private OrderEventStore newEventStore(StoredOrderEventRepository repository) {
        return new OrderEventStore(repository, new ObjectMapper().findAndRegisterModules(),
                100, 10, Duration.ofSeconds(30), Duration.ofSeconds(5));
    }
}
