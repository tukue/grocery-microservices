package com.grocery.microservices.summary.messaging;

import com.grocery.microservices.summary.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedConsumer {
    private static final Logger log = LoggerFactory.getLogger(OrderCreatedConsumer.class);
    private final OrderEventProcessor processor;
    private final MeterRegistry meterRegistry;
    private final String consumerGroup;

    public OrderCreatedConsumer(OrderEventProcessor processor, MeterRegistry meterRegistry,
                                @Value("${app.kafka.consumer-group}") String consumerGroup) {
        this.processor = processor;
        this.meterRegistry = meterRegistry;
        this.consumerGroup = consumerGroup;
    }

    @KafkaListener(topics = "${app.kafka.topics.order-created}", groupId = "${app.kafka.consumer-group}",
            concurrency = "${app.kafka.consumer.concurrency:1}")
    public void consume(ConsumerRecord<String, OrderCreatedEvent> record) {
        long startedAt = System.nanoTime();
        OrderCreatedEvent event = record.value();
        try {
            processor.process(event);
            meterRegistry.counter("kafka.events.consumed", "topic", record.topic(), "consumer_group", consumerGroup)
                    .increment();
            log.info("EVENT=ORDER_CREATED_CONSUMED EVENT_ID={} ORDER_ID={} TOPIC={} PARTITION={} OFFSET={} CONSUMER_GROUP={}",
                    event.eventId(), event.orderId(), record.topic(), record.partition(), record.offset(), consumerGroup);
        } catch (RuntimeException exception) {
            meterRegistry.counter("kafka.events.failed", "topic", record.topic(), "consumer_group", consumerGroup)
                    .increment();
            log.warn("EVENT=ORDER_CREATED_PROCESSING_FAILED EVENT_ID={} TOPIC={} PARTITION={} OFFSET={} CONSUMER_GROUP={} REASON={}",
                    event == null ? null : event.eventId(), record.topic(), record.partition(), record.offset(), consumerGroup,
                    exception.getClass().getSimpleName());
            throw exception;
        } finally {
            Timer.builder("kafka.event.processing.duration").tag("topic", record.topic())
                    .tag("consumer_group", consumerGroup).register(meterRegistry)
                    .record(System.nanoTime() - startedAt, java.util.concurrent.TimeUnit.NANOSECONDS);
        }
    }
}
