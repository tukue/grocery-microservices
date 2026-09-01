package com.grocery.microservices.order.eventstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!test")
public class StoredOrderEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(StoredOrderEventPublisher.class);

    private final StoredOrderEventRepository repository;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final String topic;

    public StoredOrderEventPublisher(StoredOrderEventRepository repository, ObjectMapper objectMapper,
                                KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                                @Value("${app.kafka.topics.order-created}") String topic) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    @Scheduled(fixedDelayString = "${app.kafka.event-store.fixed-delay-ms:1000}")
    @Transactional
    public void publishPendingEvents() {
        for (StoredOrderEvent storedEvent : repository.findTop100ByStatusOrderByCreatedAtAsc(StoredOrderEventStatus.PENDING)) {
            try {
                OrderCreatedEvent event = objectMapper.readValue(storedEvent.getPayload(), OrderCreatedEvent.class);
                kafkaTemplate.send(topic, event.orderId().toString(), event).get();
                storedEvent.markPublished();
                log.info("EVENT=STORED_ORDER_EVENT_PUBLISHED EVENT_ID={} ORDER_ID={} TOPIC={}",
                        storedEvent.getId(), event.orderId(), topic);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                storedEvent.recordFailure(exception);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} REASON={}",
                        storedEvent.getId(), exception.getClass().getSimpleName());
                return;
            } catch (Exception exception) {
                storedEvent.recordFailure(exception);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} REASON={}",
                        storedEvent.getId(), exception.getClass().getSimpleName());
            }
        }
    }
}
