# E-commerce Business Implementation Roadmap

## Purpose

This roadmap evolves the current grocery microservices MVP into a commercially useful e-commerce platform. It prioritizes a trustworthy customer purchase flow before introducing additional infrastructure or services.

The target customer journey is:

```text
Browse catalog -> Add products to cart -> Adjust cart -> Checkout -> Pay -> Track order -> Receive receipt
```

## Current Starting Point

The repository already has four Spring Boot services:

| Service | Current responsibility | Business role |
| --- | --- | --- |
| `product-service` | Product catalog CRUD and search | Product discovery and pricing source |
| `cart-service` | Mutable cart items and quantities | Customer shopping session |
| `order-service` | Order persistence and status transitions | Purchase record and order lifecycle |
| `summary-service` | Receipts and spending summaries | Customer confirmation and reporting |

The MVP currently supports catalog browsing and cart changes, but checkout is not yet trustworthy: cart items contain a product name and client-supplied price, while orders contain product IDs and a client-supplied total. Those contracts must be aligned before the application can process real purchases.

## Delivery Principles

- Deliver one customer-facing vertical slice at a time.
- Keep each service responsible for its own data and business rules.
- Treat client-supplied prices and totals as requests, not trusted financial data.
- Keep synchronous REST calls limited to the checkout path until asynchronous integration is justified.
- Add tests for the happy path and important failures with every business change.
- Do not introduce a service mesh, event broker, or distributed transaction framework until a demonstrated business need exists.

## Phase 1: Align Catalog and Cart Contracts

**Priority:** P0  
**Business outcome:** A cart contains identifiable products and can be validated against the catalog.
**Status:** Implemented

### Work

1. Add `productId` to `CartItem`, `CartItemDTO`, and persisted cart data.
2. Change the add-to-cart API to accept a product ID and quantity instead of a client-owned price.
3. Have `cart-service` retrieve the product from `product-service` and store an item snapshot: product ID, name, unit price, and quantity.
4. Reject a missing, out-of-stock, or invalid product with a clear API error.
5. Keep the existing quantity-update and remove-item APIs operating on cart item IDs.

### Definition of Done

- A customer can add a valid catalog product to a cart.
- The stored item has a stable `productId` and server-derived price snapshot.
- Invalid or out-of-stock products do not change the cart.
- Controller and service tests cover valid product, missing product, and invalid quantity cases.

## Phase 2: Trusted Checkout and Order Lines

**Priority:** P0  
**Business outcome:** Customers can submit a cart as an order without controlling the final total.
**Status:** Implemented (cart ownership and current-cart retrieval are implemented; post-checkout cart state remains Phase 3 work)

### Work

1. Introduce `POST /orders/checkout` using a cart ID and authenticated customer identity.
2. Retrieve the cart through a small, explicit cart-service client with externalized service URLs and timeouts.
3. Reject missing, empty, or non-owned carts before creating an order.
4. Calculate the order total from cart item snapshots; remove client-supplied `total` from the checkout request.
5. Replace `Order.productIds` with immutable order lines containing product ID, product name, unit price, quantity, and line total.
6. Persist the created order as `PENDING` and return its generated ID and trusted total.
7. Clear or mark the cart as checked out only after the order is successfully persisted.

### Definition of Done

- A valid cart creates exactly one order with immutable order lines.
- Manipulating a request total or product list cannot alter the persisted order amount.
- Cart/product downstream failures return meaningful `404` or `503` responses and do not persist a partial order.
- Tests cover checkout success, empty cart, missing cart, cart ownership, and downstream unavailability.

### Implemented MVP Slice

- Added `POST /orders/checkout`, accepting only a validated cart ID and deriving the customer from the authenticated principal.
- Added an explicit cart-service client with externally configured base URLs, short timeouts, and forwarded customer authorization.
- Calculates the trusted total and immutable order lines from persisted cart snapshots; checkout requests cannot provide prices, product lists, or totals.
- Returns `404` for a missing cart, `409` for an empty cart, and `503` when cart-service is unavailable; no order is persisted for these failures.
- Cart ownership and current-cart retrieval are implemented. Post-checkout cart state remains Phase 3 work.

## Phase 3: Customer Identity and Account Ownership

**Priority:** P1  
**Business outcome:** Customers can safely manage only their own carts and orders.
**Status:** Partially implemented

### Work

1. Replace static demo authentication with a real identity provider or Spring Authorization Server integration.
2. Add customer ID ownership to carts, orders, and summaries.
3. Derive customer identity from the validated JWT; do not accept it as a mutable request field.
4. Add `GET /carts/current`, `GET /orders`, and `GET /orders/{id}` with ownership checks. `GET /carts/current` and order ownership endpoints are implemented.
5. Add customer order history and receipt retrieval.

### Definition of Done

- One authenticated customer cannot read or mutate another customer's data.
- Customer identity is consistent across cart, order, and receipt records.
- Authorization failures return `403` without exposing resource details.

### Implemented MVP Slice

- Carts and orders persist the authenticated customer identity and enforce ownership checks.
- Added `GET /orders` for customer order history and protected `GET /orders/{id}` with a `403` response for another customer's order.
- Real external identity-provider integration and receipt retrieval remain pending.

## Phase 4: Product Availability and Inventory

**Priority:** P1  
**Business outcome:** Customers cannot buy products that are out of stock.
**Status:** Partially implemented

### Work

1. Add product availability and stock quantity to `product-service`.
2. Validate availability when adding products to a cart.
3. Reserve or decrement stock during checkout using a simple synchronous MVP contract.
4. Return stock if checkout or payment fails.
5. Add an administrative API for catalog and stock updates.

### Definition of Done

- Checkout cannot confirm quantities above available stock.
- Stock changes are auditable and tested for concurrent checkout attempts.
- Product availability is exposed to the storefront API.

### Implemented MVP Slice

- Product-service now persists and exposes non-negative `stockQuantity` alongside availability.
- Cart-service validates catalog stock when adding an item and rejects cumulative quantities above available stock with `409 Conflict`.
- Customers receive a clear stock response showing the total requested quantity and currently available units, helping them adjust their cart confidently.
- Product and cart tests cover stock exposure, negative-stock validation, single-request stock validation, and cumulative cart-quantity protection.
- Stock reservation/decrement during checkout and concurrent checkout handling remain pending.

## Phase 5: Payments and Order Fulfilment

**Priority:** P1/P2  
**Business outcome:** Orders can be paid for and delivered with traceable state changes.

### Work

1. Add a `payment-service` that records payment attempts, provider references, and payment state.
2. Do not store card numbers, CVV values, or raw payment credentials; use a PCI-compliant provider's token/reference.
3. Extend the order lifecycle to payment and fulfilment states, for example:

   ```text
   PENDING_PAYMENT -> PAID -> FULFILMENT -> SHIPPED -> DELIVERED
   ```

4. Define cancellation and refund rules, including which states allow each transition.
5. Add a fulfilment capability only when warehouse, pickup, or shipment operations need independent ownership.
6. Generate a receipt after payment confirmation, not merely after an order request is submitted.

### Definition of Done

- Payment failures do not create paid orders.
- Payment and order state changes are traceable by order ID.
- Cancellation and refund behavior is explicit and tested.

## Phase 6: Reliable Cross-Service Workflows

**Priority:** P2  
**Business outcome:** Payments, stock, receipt generation, and fulfilment stay consistent as traffic and workflows grow.

### Work

1. Add an outbox table to the owning service for durable business events such as `OrderPaid` and `StockReserved`.
2. Publish events to a broker only when at least two downstream services require asynchronous processing.
3. Make consumers idempotent using an event ID and processed-event record.
4. Add compensation workflows for failed stock reservation, payment reversal, and fulfilment cancellation.
5. Add contract tests for service clients and events.

### Definition of Done

- A temporary downstream outage does not silently lose a confirmed business event.
- Reprocessing an event does not duplicate a receipt, charge, or stock decrement.
- Operational dashboards expose failed workflow steps.

## Phase 7: Production Readiness

**Priority:** P2  
**Business outcome:** The platform can be operated safely in a real environment.

### Work

1. Add Flyway or Liquibase migrations for every service-owned database.
2. Use managed secrets and separate runtime configuration by environment.
3. Add request timeouts, bounded retries only for safe operations, and downstream error mapping.
4. Add API rate limiting and audit logs for administrative operations.
5. Expand the existing Actuator, Prometheus, and Grafana setup with checkout success, payment failure, stock, and latency dashboards.
6. Add alerting for error rate, unavailable dependencies, and failed background workflows.

### Definition of Done

- Production deployments use migrations rather than Hibernate schema updates.
- Sensitive configuration is never stored in source control.
- Operators can identify a failed checkout by order ID and determine the failing dependency.

## Service Ownership Target

| Service | Owns | Does not own |
| --- | --- | --- |
| `product-service` | Catalog data, current price, availability, stock | Carts and orders |
| `cart-service` | Customer carts and cart item snapshots | Final order totals or payments |
| `order-service` | Order lines, trusted totals, lifecycle | Product catalog or payment credentials |
| `summary-service` | Receipts and customer reporting views | Source-of-truth order state |
| Future `payment-service` | Payment attempts and provider references | Order lifecycle ownership |
| Future fulfilment capability | Packing, shipment, pickup, delivery | Payment processing |

Each service should own its schema and expose information through an API or event contract. Other services must not query its database directly.

## API and Data Rules

- Use request DTOs at every HTTP boundary and validate them with Bean Validation.
- Return typed, consistent `400`, `403`, `404`, and `503` errors without exposing implementation details.
- Use generated IDs for service-owned resources; never trust a client-provided financial total.
- Persist money using `BigDecimal` with an explicit currency before real payment support.
- Preserve product and price snapshots on cart/order lines so historical orders remain correct when the catalog changes.
- Make checkout idempotent with an idempotency key before enabling real payment retries.

## Recommended First Delivery

Begin with **Phase 1: Align Catalog and Cart Contracts**. Adding `productId` and server-derived cart snapshots is the smallest change that unlocks trusted checkout, inventory, payment, receipts, and fulfilment without redesigning the existing service boundaries.

## Related Documentation

- [Architecture overview](architecture-overview.md)
- [API documentation](api-documentation.md)
- [Developer guide](developer-guide.md)
- [Production readiness review](production-readiness-review.md)
