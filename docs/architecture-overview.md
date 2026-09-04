# Architecture Overview

## Current Shape

The production surface is a Maven multi-module Spring Boot 3.2 application with four deployable services:

- `product-service`: product catalog CRUD and search.
- `cart-service`: cart aggregate and cart-item operations.
- `order-service`: order lifecycle and status transitions.
- `summary-service`: order summaries, spending calculations, and receipt formatting.

Each service follows the same package style:

- `controller`: HTTP API layer.
- `dto`: request/response models.
- `service`: business logic and transaction boundary.
- `repository`: Spring Data JPA persistence port.
- `model`: JPA entities.
- `exception`: API exception mapping.
- `config`: security, JWT, and OpenAPI configuration.

## Ecommerce MVP Architecture

The frontend owns user interaction and calls the service APIs over HTTPS. The backend owns
validation, pricing, authorization, and persistence. Kafka is an internal asynchronous
integration mechanism; the browser never produces to or consumes from Kafka.

```mermaid
flowchart LR
    Browser[Web frontend\nReact / TypeScript] -->|HTTPS REST\nBearer token| Entry[Public API entry\nALB or local service URLs]

    Entry --> Product[Product service\nCatalog and search]
    Entry --> Cart[Cart service\nCart mutations]
    Entry --> Order[Order service\nCheckout and orders]
    Entry --> Summary[Summary service\nReceipt read model]

    Product --> ProductDb[(Product DB)]
    Cart --> CartDb[(Cart DB)]
    Order --> OrderDb[(Order DB)]
    Order --> EventStore[(Order event store)]

    EventStore -->|key: orderId\norder.created.v1| Kafka[(Kafka)]
    Kafka -->|summary-service group\ncommit after persistence| Summary
    Kafka -->|exhausted consumer retries| Failed[order.created.v1.failed\nFailed-letter queue]
    Summary --> SummaryDb[(Summary DB\nunique orderId)]

    Browser -.->|poll after checkout\nGET summaries/by-order/{orderId}| Summary
```

### Checkout Mental Model

1. The frontend reads products, creates or updates a cart, and sends checkout to `order-service`.
2. `order-service` validates the authenticated user and cart, persists the order and an
   `order.created.v1` event record in one database transaction.
3. A leased relay publishes the event to Kafka using `orderId` as the key, preserving ordering
   for a single order without holding the HTTP transaction open for broker delivery.
4. `summary-service` processes the event idempotently and persists a receipt/summary read model.
5. The frontend renders **Order confirmed** immediately, then treats a `404` from
   `GET /summaries/by-order/{orderId}` as pending rather than as checkout failure.

### MVP Boundaries

- Use direct service routes behind the public entry point; do not add a BFF or API gateway yet.
- Keep each service database private. Cross-service reads use HTTP contracts; asynchronous
  projections use Kafka events.
- Publish versioned OpenAPI documents and generate or verify frontend types from them.
- Configure the frontend origin through `CORS_ALLOWED_ORIGINS`; do not ship backend addresses,
  Kafka endpoints, or secrets in browser bundles.
- The failed-letter queue is for operations and controlled replay only, never for browser access.

## Improvements Applied

- Replaced field injection in production controllers/config/services with constructor injection. This makes required dependencies explicit and easier to test.
- Added domain-specific not-found exceptions for products, orders, and summaries. API code no longer depends on parsing generic exception messages.
- Kept cart item loading lazy at the entity level and added an `@EntityGraph` to repository reads. This avoids default eager loading while preventing lazy-loading surprises when returning a cart aggregate.
- Fixed summary API mapping so `SummaryDTO.total/items` persist to `Summary.totalAmount/details`.
- Added order persistence for `cartId` and `productIds`, matching the API contract.
- Removed stale product-service scaffolding outside Maven's source tree.

## Recommended Next Architecture Steps

- Introduce mapper classes or MapStruct for each service once DTO/entity mapping grows beyond simple field copies.
- Extract common error-response and JWT filter code only after service contracts stabilize. A shared library can reduce duplication, but it also couples independent deployments.
- Split demo authentication from production authentication. Current `/auth/login` uses static credentials and should be replaced by an identity provider or Spring Authorization Server integration.
- Add explicit bounded contexts in package names when domain logic grows, for example `product.catalog`, `cart.checkout`, `order.fulfillment`, and `summary.reporting`.
