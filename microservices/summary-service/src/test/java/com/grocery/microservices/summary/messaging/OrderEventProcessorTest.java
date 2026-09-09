package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import com.grocery.microservices.summary.model.ProcessedOrderEvent;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.repository.ProcessedOrderEventRepository;
import com.grocery.microservices.summary.repository.SummaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
class OrderEventProcessorTest {

    private SummaryRepository summaryRepository;
    private ProcessedOrderEventRepository processedEventRepository;
    private OrderEventProcessor processor;

    @BeforeEach
    void setUp() {
        summaryRepository = mock(SummaryRepository.class);
        processedEventRepository = mock(ProcessedOrderEventRepository.class);
        processor = new OrderEventProcessor(summaryRepository, processedEventRepository);
    }

    private OrderCreatedEvent event(Long orderId) {
        return new OrderCreatedEvent(UUID.randomUUID(), Instant.parse("2026-01-01T00:00:00Z"),
                orderId, "customer-1", 7L, 19.95);
    }

    @Test
    void appliesEventIntoSummaryProjection() {
        OrderCreatedEvent event = event(42L);

        processor.process(event);

        verify(summaryRepository).save(any(Summary.class));
        verify(processedEventRepository).save(any(ProcessedOrderEvent.class));
    }

    @Test
    void ignoresReplayedEventWithSameEventId() {
        OrderCreatedEvent event = event(42L);
        when(processedEventRepository.existsById(event.eventId().toString())).thenReturn(true);

        processor.process(event);

        verify(summaryRepository, never()).save(any(Summary.class));
    }

    @Test
    void ignoresEventWhenOrderAlreadySummarised() {
        OrderCreatedEvent event = event(42L);
        when(summaryRepository.findByOrderId(42L)).thenReturn(Optional.of(new Summary()));

        processor.process(event);

        verify(summaryRepository, never()).save(any(Summary.class));
    }

    @Test
    void rejectsInvalidEvent() {
        OrderCreatedEvent event = new OrderCreatedEvent(UUID.randomUUID(), Instant.now(), null, "customer-1", 7L, 19.95);

        assertThrows(IllegalArgumentException.class, () -> processor.process(event));
        verify(summaryRepository, never()).save(any(Summary.class));
    }
}