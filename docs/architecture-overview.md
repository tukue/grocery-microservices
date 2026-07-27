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
