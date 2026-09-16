package com.grocery.microservices.order.eventstore;

import tools.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
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
    private final Counter publishedCounter;
    private final Counter failedCounter;
    private final Counter terminalFailedCounter;

    public StoredOrderEventPublisher(OrderEventStore eventStore, ObjectMapper objectMapper,
                                KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                                MeterRegistry meterRegistry,
                                @Value("${app.kafka.topics.order-created}") String topic,
                                @Value("${app.kafka.event-store.publish-timeout:PT30S}") Duration publishTimeout) {
        this.eventStore = eventStore;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
        this.publishTimeout = publishTimeout;
        this.publishedCounter = Counter.builder("outbox.events.published")
                .tag("topic", topic).register(meterRegistry);
        this.failedCounter = Counter.builder("outbox.events.failed")
                .tag("topic", topic).register(meterRegistry);
        this.terminalFailedCounter = Counter.builder("outbox.events.terminal_failed")
                .tag("topic", topic).register(meterRegistry);
        Gauge.builder("outbox.events.pending", eventStore, OrderEventStore::countPendingEvents)
                .tag("topic", topic).register(meterRegistry);
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
                publishedCounter.increment();
                log.info("EVENT=STORED_ORDER_EVENT_PUBLISHED EVENT_ID={} ORDER_ID={} TOPIC={}",
                        delivery.id(), event.orderId(), topic);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                StoredOrderEventStatus status = eventStore.recordDeliveryFailure(delivery.id(), exception);
                recordFailure(status);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} TOPIC={} REASON={}",
                        delivery.id(), topic, exception.getClass().getSimpleName());
                return;
            } catch (Exception exception) {
                StoredOrderEventStatus status = eventStore.recordDeliveryFailure(delivery.id(), exception);
                recordFailure(status);
                log.error("EVENT=STORED_ORDER_EVENT_PUBLISH_FAILED EVENT_ID={} TOPIC={} REASON={}",
                        delivery.id(), topic, exception.getClass().getSimpleName());
            }
        }
    }

    private void recordFailure(StoredOrderEventStatus status) {
        if (status == StoredOrderEventStatus.FAILED) {
            terminalFailedCounter.increment();
            return;
        }
        failedCounter.increment();
    }
}