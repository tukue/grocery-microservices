package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import com.grocery.microservices.summary.model.ProcessedOrderEvent;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.port.SummaryProjectionUpdater;
import com.grocery.microservices.summary.repository.ProcessedOrderEventRepository;
import com.grocery.microservices.summary.repository.SummaryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class OrderEventProcessor implements SummaryProjectionUpdater {
    private final SummaryRepository summaryRepository;
    private final ProcessedOrderEventRepository processedEventRepository;

    public OrderEventProcessor(SummaryRepository summaryRepository,
                               ProcessedOrderEventRepository processedEventRepository) {
        this.summaryRepository = summaryRepository;
        this.processedEventRepository = processedEventRepository;
    }

    @Override
    @Transactional
    public void process(OrderCreatedEvent event) {
        validate(event);
        if (processedEventRepository.existsById(event.eventId().toString())) {
            return;
        }
        if (summaryRepository.findByOrderId(event.orderId()).isPresent()) {
            return;
        }
        Summary summary = new Summary();
        summary.setOrderId(event.orderId());
        summary.setUserId(event.userId());
        summary.setTotalAmount(BigDecimal.valueOf(event.total()));
        summary.setItemCount(0);
        summary.setCreatedAt(LocalDateTime.now());
        summary.setDetails("Order created");
        summaryRepository.save(summary);

        ProcessedOrderEvent processed = new ProcessedOrderEvent();
        processed.setEventId(event.eventId().toString());
        processed.setProcessedAt(LocalDateTime.now());
        processedEventRepository.save(processed);
    }

    private void validate(OrderCreatedEvent event) {
        if (event == null || event.eventId() == null || event.orderId() == null
                || event.orderId() <= 0 || event.userId() == null || event.userId().isBlank()
                || event.cartId() == null || event.cartId() <= 0 || event.total() < 0) {
            throw new IllegalArgumentException("Invalid order-created event");
        }
    }
}