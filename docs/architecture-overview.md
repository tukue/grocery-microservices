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

## Full-Stack Deployment View

This is the target shape for a deployable ecommerce MVP. The frontend is independently
released static content; it holds only public configuration such as the API base URL. The
backend and Kafka remain private behind the API entry point and platform network controls.

```mermaid
flowchart TB
    Customer[Customer browser]

    subgraph Frontend[Frontend delivery]
        WebApp[React / TypeScript storefront]
        Cdn[CDN and static hosting]
        WebApp --> Cdn
    end

    subgraph Edge[Public edge]
        Tls[HTTPS and TLS]
        Api[Public API entry\nALB path routing]
    end

    subgraph Backend[Spring Boot microservices]
        ProductApi[Product API]
        CartApi[Cart API]
        OrderApi[Order API]
        SummaryApi[Summary API]
        EventRelay[Order event relay]
    end

    subgraph Data[Private data and messaging]
        ProductDb[(Product PostgreSQL)]
        CartDb[(Cart PostgreSQL)]
        OrderDb[(Order PostgreSQL\nand event store)]
        Kafka[(Kafka\norder.created.v1)]
        FailedQueue[(Kafka\norder.created.v1.failed)]
        SummaryDb[(Summary PostgreSQL)]
    end

    subgraph Operations[Operations]
        Metrics[Metrics and dashboards]
        Logs[Structured logs]
        Alerts[Alerts and replay runbook]
    end

    Customer -->|loads storefront| Cdn
    Customer -->|HTTPS REST + bearer token| Tls --> Api
    Api -->|/products| ProductApi
    Api -->|/carts| CartApi
    Api -->|/orders| OrderApi
    Api -->|/summaries| SummaryApi

    ProductApi --> ProductDb
    CartApi --> CartDb
    OrderApi --> OrderDb
    OrderApi --> EventRelay
    EventRelay -->|orderId key| Kafka
    Kafka -->|summary-service consumer group| SummaryApi
    Kafka -->|bounded retries exhausted| FailedQueue
    SummaryApi --> SummaryDb

    ProductApi -.-> Metrics
    CartApi -.-> Metrics
    OrderApi -.-> Metrics
    SummaryApi -.-> Metrics
    Metrics --> Alerts
    Logs --> Alerts
    FailedQueue --> Alerts
```

### Frontend-to-Backend Contract

| Concern | Frontend responsibility | Backend/platform responsibility |
| --- | --- | --- |
| API access | Use one typed client and the configured public API base URL. | Route APIs, enforce TLS, authenticate/authorize, and expose OpenAPI. |
| Cart and checkout | Render server responses as canonical state; prevent duplicate clicks. | Validate prices and stock; persist order and event intent atomically. |
| Receipt availability | Show order confirmation, then poll by order ID with a bounded retry UX. | Build the summary asynchronously and return `404` until it exists. |
| Kafka | No direct browser connection or credentials. | Operate topics, retries, failed-letter queue, metrics, and controlled replay. |
| Configuration | Ship public runtime configuration only. | Inject `CORS_ALLOWED_ORIGINS`, database/Kafka credentials, and secrets at deployment. |

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
