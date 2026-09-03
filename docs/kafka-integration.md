# Kafka Integration Guide

## Purpose and Boundaries

Kafka carries the asynchronous `OrderCreatedEvent` from `order-service` to `summary-service`.
It is not the source of truth for an order: the order database is authoritative and the
summary is a rebuildable read model.

| Component | Ownership | Responsibility |
| --- | --- | --- |
| `order-service` | Producer | Persist an order and its pending event in one database transaction. |
| `order_event_store` | Order database | Retain pending, processing, published, and terminally failed events. |
| `summary-service` | Consumer | Build one summary per order and safely tolerate redelivery. |
| `order.created.v1.failed` | Operations | Failure-letter queue (FLQ) retaining records that exhaust summary consumer retries. |

## Event Flow

1. `OrderService` saves the order and enqueues an `OrderCreatedEvent` in the same transaction.
2. `StoredOrderEventPublisher` claims pending events with a time-limited lease.
3. It publishes each event to `order.created.v1`, keyed by `orderId`, and waits only for the configured delivery timeout.
4. A confirmed send marks the stored event `PUBLISHED`. A send failure or timeout records the failure and schedules the next attempt.
5. `summary-service` consumes the event as consumer group `summary-service` and writes a summary.
6. The summary database enforces one row per `orderId`; duplicate Kafka deliveries therefore do not create duplicate summaries.

This is an at-least-once flow. A producer can publish successfully just before it loses the acknowledgement, so consumers must always remain idempotent.

## Topics, Keys, and Ordering

| Topic | Producer | Consumer group | Partitions | Key |
| --- | --- | --- | --- | --- |
| `order.created.v1` | `order-service` | `summary-service` | 3 locally | `orderId` |
| `order.created.v1.failed` | Summary retry recoverer | None by default | Matches source partition | Original record key |

The key is the order ID. Kafka sends records with the same key to the same partition, preserving their partition order. Ordering across different orders is not guaranteed and is not required.

Topic names include a version. A breaking event-contract change requires a new topic/version and a parallel consumer migration; do not silently reuse `order.created.v1` with an incompatible JSON shape.

## Producer Reliability

The order producer uses the database-backed event store rather than publishing directly in the HTTP transaction. This prevents a confirmed order from losing its intent to publish during a Kafka outage.

- `acks=all` and idempotent production reduce duplicate writes caused by producer retries.
- `KAFKA_PRODUCER_RETRIES` and `KAFKA_DELIVERY_TIMEOUT_MS` control Kafka client retries and delivery time.
- `KAFKA_EVENT_STORE_PUBLISH_TIMEOUT` bounds the relay's wait for Kafka acknowledgement (default `PT30S`). A timeout is recorded as a delivery failure; the event is not marked published.
- `KAFKA_EVENT_STORE_RETRY_DELAY` controls when a failed stored event is attempted again.
- `KAFKA_EVENT_STORE_MAXIMUM_RETRIES` limits relay retries. Events exceeding the limit remain terminal `FAILED` records in `order_event_store` for operator investigation.

The relay publishes outside the database transaction. Its lease protects against concurrent relay instances; a record is available again after `KAFKA_EVENT_STORE_LEASE_DURATION` if a relay stops unexpectedly.

## Consumer Retries and Failure-Letter Queue

`summary-service` uses Spring Kafka's `DefaultErrorHandler` with a bounded fixed backoff:

- `KAFKA_SUMMARY_RETRY_DELAY_MS` sets the delay between processing attempts.
- `KAFKA_SUMMARY_MAXIMUM_RETRIES` sets the number of retries after the initial processing attempt.
- When processing still fails, Spring Kafka publishes the original record to `<source-topic>.failed`, preserving its partition.

The failure-letter queue is deliberately not consumed automatically. Inspect the record, correct the underlying issue, then replay it with an explicit operator action. This prevents poison messages from repeatedly blocking the main consumer group.

## Configuration Reference

| Variable | Default | Used by |
| --- | --- | --- |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` locally, `kafka:9092` in Docker | Both services |
| `KAFKA_ORDER_CREATED_TOPIC` | `order.created.v1` | Both services |
| `KAFKA_SUMMARY_CONSUMER_GROUP` | `summary-service` | Summary consumer |
| `KAFKA_PRODUCER_RETRIES` | `3` | Order producer |
| `KAFKA_DELIVERY_TIMEOUT_MS` | `30000` | Order producer |
| `KAFKA_EVENT_STORE_BATCH_SIZE` | `100` | Order relay |
| `KAFKA_EVENT_STORE_LEASE_DURATION` | `PT30S` | Order relay |
| `KAFKA_EVENT_STORE_RETRY_DELAY` | `PT5S` | Order relay |
| `KAFKA_EVENT_STORE_MAXIMUM_RETRIES` | `10` | Order relay |
| `KAFKA_EVENT_STORE_PUBLISH_TIMEOUT` | `PT30S` | Order relay |
| `KAFKA_SUMMARY_RETRY_DELAY_MS` | `1000` | Summary retry handler |
| `KAFKA_SUMMARY_MAXIMUM_RETRIES` | `3` | Summary retry handler |

Production must supply `KAFKA_BOOTSTRAP_SERVERS` and broker authentication through environment variables or secret management. Local Docker Compose intentionally uses plaintext Kafka. Enable TLS/SASL using Spring Kafka client properties and injected secrets before using a shared or internet-reachable broker.

## Local Development

Start Kafka, the databases, and topic initialization from `microservices`:

```sh
docker compose up -d kafka kafka-init order-db summary-db
```

The initializer creates `order.created.v1` and `order.created.v1.failed`, each with three partitions. Start the services with the Docker profile or their normal Spring Boot commands after the dependencies are healthy.

Inspect local topics:

```sh
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

## Operational Checklist

- Alert on `FAILED` rows in `order_event_store` and on growth of `order.created.v1.failed`.
- Use event ID, order ID, topic, partition, and offset when investigating a failure; do not log customer, payment, or credential data.
- Replay only after fixing the cause and confirm the summary's idempotency behavior.
- Keep the failed-topic retention long enough for investigation.
- Test producer failure, relay timeout, duplicate delivery, consumer retry exhaustion, and replay whenever the event contract changes.

## MVP Limitations

- The order event store is a lightweight transactional outbox, not a general workflow engine.
- There is no schema registry; event compatibility is maintained by versioned topic names and additive payload changes.
- Failed consumer records require manual review and replay.
- Local Kafka is single-node and has no TLS/SASL. Production requires managed Kafka with appropriate replication, ACLs, TLS, SASL, and monitoring.
