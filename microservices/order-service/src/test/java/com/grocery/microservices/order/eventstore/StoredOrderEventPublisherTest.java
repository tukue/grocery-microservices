package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StoredOrderEventPublisherTest {

    @Test
    void publishesClaimedEventAndMarksItPublished() throws Exception {
        OrderEventStore eventStore = mock(OrderEventStore.class);
        KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate = mock(KafkaTemplate.class);
        OrderCreatedEvent event = event();
        StoredOrderEventDelivery delivery = new StoredOrderEventDelivery(event.eventId(),
                new ObjectMapper().findAndRegisterModules().writeValueAsString(event));
        when(eventStore.claimProcessableEvents()).thenReturn(List.of(delivery));
        CompletableFuture<SendResult<String, OrderCreatedEvent>> result = CompletableFuture.completedFuture(null);
        when(kafkaTemplate.send(eq("order.created.v1"), eq("42"), any(OrderCreatedEvent.class))).thenReturn(result);

        new StoredOrderEventPublisher(eventStore, new ObjectMapper().findAndRegisterModules(), kafkaTemplate,
                "order.created.v1", Duration.ofSeconds(1)).publishPendingEvents();

        verify(eventStore).markPublished(event.eventId());
    }

    @Test
    void schedulesRetryWhenKafkaPublishingFails() throws Exception {
        OrderEventStore eventStore = mock(OrderEventStore.class);
        KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate = mock(KafkaTemplate.class);
        OrderCreatedEvent event = event();
        StoredOrderEventDelivery delivery = new StoredOrderEventDelivery(event.eventId(),
                new ObjectMapper().findAndRegisterModules().writeValueAsString(event));
        when(eventStore.claimProcessableEvents()).thenReturn(List.of(delivery));
        CompletableFuture<SendResult<String, OrderCreatedEvent>> result =
                CompletableFuture.failedFuture(new IllegalStateException("Kafka unavailable"));
        when(kafkaTemplate.send(eq("order.created.v1"), eq("42"), any(OrderCreatedEvent.class))).thenReturn(result);

        new StoredOrderEventPublisher(eventStore, new ObjectMapper().findAndRegisterModules(), kafkaTemplate,
                "order.created.v1", Duration.ofSeconds(1)).publishPendingEvents();

        verify(eventStore).recordDeliveryFailure(eq(event.eventId()), any(Throwable.class));
    }

    @Test
    void schedulesRetryWhenKafkaPublishingTimesOut() throws Exception {
        OrderEventStore eventStore = mock(OrderEventStore.class);
        KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate = mock(KafkaTemplate.class);
        OrderCreatedEvent event = event();
        StoredOrderEventDelivery delivery = new StoredOrderEventDelivery(event.eventId(),
                new ObjectMapper().findAndRegisterModules().writeValueAsString(event));
        when(eventStore.claimProcessableEvents()).thenReturn(List.of(delivery));
        when(kafkaTemplate.send(eq("order.created.v1"), eq("42"), any(OrderCreatedEvent.class)))
                .thenReturn(new CompletableFuture<>());

        new StoredOrderEventPublisher(eventStore, new ObjectMapper().findAndRegisterModules(), kafkaTemplate,
                "order.created.v1", Duration.ZERO).publishPendingEvents();

        verify(eventStore).recordDeliveryFailure(eq(event.eventId()), any(Throwable.class));
    }

    private OrderCreatedEvent event() {
        return new OrderCreatedEvent(UUID.randomUUID(), OrderCreatedEvent.TYPE,
                Instant.parse("2026-01-01T00:00:00Z"), 42L, "customer-1", 7L, 19.95);
    }
}
