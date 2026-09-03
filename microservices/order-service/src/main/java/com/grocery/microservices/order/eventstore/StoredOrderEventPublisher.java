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

import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Profile("!test")
public class StoredOrderEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(StoredOrderEventPublisher.class);

    private final OrderEventStore eventStore;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final String topic;
    private final Duration publishTimeout;

    public StoredOrderEventPublisher(OrderEventStore eventStore, ObjectMapper objectMapper,
                                KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                                @Value("${app.kafka.topics.order-created}") String topic,
                                @Value("${app.kafka.event-store.publish-timeout:PT30S}") Duration publishTimeout) {
        this.eventStore = eventStore;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
        this.publishTimeout = publishTimeout;
    }

    @Scheduled(fixedDelayString = "${app.kafka.event-store.fixed-delay-ms:1000}")
    public void publishPendingEvents() {
        List<StoredOrderEventDelivery> deliveries = eventStore.claimProcessableEvents();
        for (StoredOrderEventDelivery delivery : deliveries) {
            try {
                OrderCreatedEvent event = objectMapper.readValue(delivery.payload(), OrderCreatedEvent.class);
                kafkaTemplate.send(topic, event.orderId().toString(), event)
                        .get(publishTimeout.toMillis(), TimeUnit.MILLISECONDS);
                eventStore.markPublished(delivery.id());
                log.info("EVENT=STORED_ORDER_EVENT_PUBLISHED EVENT_ID={} ORDER_ID={} TOPIC={}",
                        delivery.id(), event.orderId(), topic);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                eventStore.recordDeliveryFailure(delivery.id(), exception);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} TOPIC={} REASON={}",
                        delivery.id(), topic, exception.getClass().getSimpleName());
                return;
            } catch (Exception exception) {
                eventStore.recordDeliveryFailure(delivery.id(), exception);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} TOPIC={} REASON={}",
                        delivery.id(), topic, exception.getClass().getSimpleName());
            }
        }
    }
}
