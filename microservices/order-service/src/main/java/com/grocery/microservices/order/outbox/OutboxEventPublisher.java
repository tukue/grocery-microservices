package com.grocery.microservices.order.outbox;

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
public class OutboxEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(OutboxEventPublisher.class);

    private final OutboxEventRepository repository;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private final String topic;

    public OutboxEventPublisher(OutboxEventRepository repository, ObjectMapper objectMapper,
                                KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate,
                                @Value("${app.kafka.topics.order-created}") String topic) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    @Scheduled(fixedDelayString = "${app.kafka.outbox.fixed-delay-ms:1000}")
    @Transactional
    public void publishPendingEvents() {
        for (OutboxEvent outboxEvent : repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxEventStatus.PENDING)) {
            try {
                OrderCreatedEvent event = objectMapper.readValue(outboxEvent.getPayload(), OrderCreatedEvent.class);
                kafkaTemplate.send(topic, event.orderId().toString(), event).get();
                outboxEvent.markPublished();
                log.info("EVENT=OUTBOX_EVENT_PUBLISHED EVENT_ID={} ORDER_ID={} TOPIC={}",
                        outboxEvent.getId(), event.orderId(), topic);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                outboxEvent.recordFailure(exception);
                log.error("EVENT=OUTBOX_EVENT_PUBLISH_FAILED EVENT_ID={} REASON={}",
                        outboxEvent.getId(), exception.getClass().getSimpleName());
                return;
            } catch (Exception exception) {
                outboxEvent.recordFailure(exception);
                log.error("EVENT=OUTBOX_EVENT_PUBLISH_FAILED EVENT_ID={} REASON={}",
                        outboxEvent.getId(), exception.getClass().getSimpleName());
            }
        }
    }
}
