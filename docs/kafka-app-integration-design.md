# Kafka integration approach for the grocery app

## Decision and current implementation

Keep customer commands on HTTP and use Kafka to project committed orders into the ledger. The order database owns order state; the ledger owns an eventually consistent receipt and spending view. The browser uses the existing Express BFF and never connects to brokers or databases.

Repository inspection confirms an order transaction plus database-backed event store, a leased publisher, `order.created.v1`, the `ledger-service` consumer group, and `order.created.v1.failed`. The BFF currently routes only product, cart, and order APIs. Receipt polling and ledger routes are proposed additions, not current functionality.

## Integrated flow

```mermaid
sequenceDiagram
    participant UI as React storefront
    participant BFF as Express BFF
    participant Order as Order service
    participant DB as Order database
    participant Relay as Event relay
    participant Kafka
    participant Ledger as Ledger service
    UI->>BFF: Authenticated checkout + idempotency key
    BFF->>Order: Customer command
    Order->>Order: Validate owned cart and reserve inventory
    Order->>DB: Commit order and event intent atomically
    Order-->>BFF: Persisted order ID
    BFF-->>UI: Order confirmation; receipt pending
    Relay->>DB: Claim pending event with lease
    Relay->>Kafka: order.created.v1, key=orderId
    Kafka->>Ledger: Deliver order event
    Ledger->>Ledger: Commit projection and deduplication record
    UI->>BFF: Poll customer receipt by order ID
    BFF->>Ledger: Authorized receipt query
    Ledger-->>UI: Receipt through BFF
```

Checkout already calls cart and product services. A local database transaction does not make those remote reservations atomic. Preserve idempotent reservation/release semantics and test compensation failures separately from Kafka delivery. Kafka availability must not determine whether a committed order is acknowledged.

## Event contract

Preserve the current v1 JSON fields: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `producer`, `orderId`, `userId`, `cartId`, `total`, `correlationId`, and `currency`. The current type is `OrderCreatedEvent`, version is `1`, and producer is `order-service`. Generate the event ID once when storing event intent; retain it through retries and replay. Derive customer identity from the validated JWT subject.

The current event uses a double total and contains no line-item snapshot. For an itemized financial receipt, introduce a reviewed v2 contract with decimal money represented as a string or integer minor units, explicit currency, and immutable purchased line items, prices, quantities, and discounts. Do not silently reinterpret v1 totals or rely on querying a cart that checkout may clear. Introduce a parallel v2 topic and a migration plan that avoids projecting the same order twice. Additive v1 changes must remain compatible with both producer and consumer records.

## Delivery and recovery

- Persist order and event intent in one transaction. Publish outside database transactions and mark the event published only after broker acknowledgement.
- Use `acks=all` and producer idempotence, while retaining at-least-once assumptions across the database and Kafka boundary.
- Set the lease longer than the maximum bounded claim-to-publish duration, including an entire sequential batch, or implement lease renewal/fencing. The documented 30-second lease and 30-second publish timeout need explicit review for batches and concurrent relays.
- Commit ledger projection and event deduplication in one transaction. Retain unique order ID protection; verify concurrent duplicate delivery as well as ordinary replay. Advance the Kafka offset only after successful processing or confirmed failure-topic publication.
- Keep the existing bounded fixed-backoff consumer policy for the MVP; a separate retry topic is not currently implemented. Classify invalid contracts as permanent failures and transient database failures as retryable.
- Use `order.created.v1.failed` with at least the source topic's partition count. Require confirmed publication before recovery advances past a failed record. Failed-topic delivery failure must remain retryable.
- Monitor terminal producer failures in the event-store table separately from consumer failures in Kafka. Replay explicitly after diagnosis, preserving event ID and original key, with an audit record and idempotency checks.
- Order ID partitioning preserves partition order, not a general aggregate sequencing guarantee. Before adding cancellation/refund events, define aggregate versions and reject stale projection updates.

## Browser and BFF contract

Add `LEDGER_SERVICE_URL` to BFF configuration and authenticated GET routing for the existing backend paths `/api/customer/ledger` and `/api/customer/ledger/orders/{orderId}/receipt`. Keep upstream access tokens server-side and use the existing session and JWT validation mechanisms. Require `ledger:read` and enforce customer ownership in the backend.

Define a stable BFF receipt response: ready with receipt content, pending only after verifying the customer owns a committed order, and an explicit unavailable response for a transient upstream failure. An arbitrary ledger 404 must not become pending, because it can mean an invalid or unauthorized order. Preserve the distinction between order lifecycle status and receipt projection status.

On confirmation, show the committed order immediately. Poll receipt with bounded exponential delay and jitter, stop on completion or navigation, and after a configurable wait budget show 'Receipt is still being prepared' with a retry action. A delayed receipt must never trigger checkout resubmission. Persist/reuse the checkout idempotency key across HTTP retries and verify its backend contract before relying on it.

## Deployment and observability

Use the existing Compose broker and topic initializer locally. For production, use a managed broker reachable from the services' private network; provision topics explicitly, with replication factor 3 and minimum in-sync replicas 2 where the broker topology supports them. Apply TLS/SASL and least-privilege ACLs: order publishes to the source topic, ledger consumes its group and publishes failures, and operators alone replay. Configure retention from the required outage/replay window and keep event identifiers free of credentials and unnecessary personal data.

Track oldest pending event age, terminal event-store failures, publication latency, consumer lag, projection delay, failed-topic growth, and receipt-pending duration. Propagate correlation and event IDs across HTTP, event-store, and Kafka logs. Choose alert thresholds from the receipt freshness objective and test them during an outage.

## Implementation sequence and acceptance

1. Contract tests for the existing producer/consumer v1 payload and database atomicity; agree on whether v2 itemized receipts are needed.
2. Review lease handling, deduplication transactions, offset acknowledgement, and failure-topic publication guarantees.
3. Add ledger BFF configuration/routes, authorization tests, and the receipt response contract.
4. Add confirmation-page polling and delayed-receipt states.
5. Run the existing container integration suite and a browser checkout-to-receipt test.

Acceptance must cover broker outage during checkout, relay restart after send-before-mark, expired lease with concurrent publishers, duplicate consumer deliveries, ledger outage, malformed events, unavailable failure topic, controlled replay, cross-customer receipt access, and lost checkout HTTP response. Successful checkout produces exactly one order and eventually one ledger projection; pending UI states recover without duplicate checkout. This design is based on source inspection; Kafka runtime behavior has not yet been validated in this onboarding task.
