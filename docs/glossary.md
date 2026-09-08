# Glossary

Common terms used across this repository, grouped by area, to give the whole team a shared
vocabulary. Terms are explained in the context of this repo, not just in general.

## Architecture

| Term | Meaning in this repo |
| --- | --- |
| Monorepo | A single Git repository containing all four microservices, shared docs, CI configuration, and infrastructure-as-code (Terraform). |
| Microservice | A small, independently deployable Spring Boot application exposing its own HTTP API. Each owns its own data store. |
| cart-service | Owns the customer shopping cart (`/api/me/cart`). Port `8081` in the compose stack. |
| order-service | Handles checkout and order lifecycle (`POST /checkout`, `/api/me/orders`). Port `8082`. |
| product-service | Catalogue and search; product and stock data. Port `8083`. |
| summary-service | Read-side projection that aggregates order events into customer summaries, receipts, and trends. Port `8084`. |
| Compose smoke stack | The local environment defined in `microservices/docker-compose.yml`: all four services, Postgres per service, and Kafka. Used by local development and the CI `health-check` job. |
| Event-driven | Services communicate by publishing/consuming events (Kafka) instead of synchronous calls where possible; the summary-service consumes order events to build read models. |
| Read model / projection | A pre-computed, denormalized view (e.g. summaries, trends) kept up to date by consuming events, so reads are cheap and fast. |
| CORS | Cross-Origin Resource Sharing; `app.cors.allowed-origins` (`CORS_ALLOWED_ORIGINS`) lists browser origins allowed to call the APIs. |

## Authentication & Authorization

| Term | Meaning in this repo |
| --- | --- |
| OAuth 2.0 / OpenID Connect (OIDC) | The standard framework used for authentication/authorization. Services act as OAuth2 resource servers and validate OIDC access tokens issued by an identity provider (IdP). |
| Resource server | A service that accepts and validates bearer tokens; our services never issue tokens (except the demo IdP) and never see passwords. |
| Identity Provider (IdP) | The trusted OAuth2/OIDC server that authenticates users and issues access tokens (e.g. Cognito in production). |
| Access token / Bearer token | The credential a client sends as `Authorization: Bearer <token>` to prove identity and authorization on every request. |
| JWT | JSON Web Token — the stateless access-token format used here. Contains claims (iss, aud, sub, scope, exp, ...) and is signed, not encrypted. |
| RS256 | The allowed signing algorithm: RSA signature with SHA-256. The token must be signed with the IdP's private key and is verified using the public JWKS. |
| Issuer (`iss`) | Claim identifying the IdP that issued the token. Must match `security.jwt.issuer-uri` (`JWT_ISSUER_URI`). |
| Audience (`aud`) | Claim identifying the intended recipient(s) of the token. Must contain `security.jwt.audience` (`JWT_AUDIENCE`), shared across all services. |
| Claim | A named key/value in a JWT (e.g. `sub`, `scope`, `iss`, `aud`, `exp`, `iat`). |
| Scope | An authorization permission, e.g. `cart:write`, `order:write`, `summary:read`. Endpoints require specific scopes via `@PreAuthorize`. Used scopes: `cart:read cart:write order:read order:write summary:read product:admin`. |
| Subject (`sub`) | Claim identifying the signed-in user; services use it as the ownership key (`customerId`) — a customer may only access data under their own `sub`. |
| Resource server config | `SecurityConfig` + `JwtDecoder` in each service: validates signature (JWKS), issuer, audience, algorithm, and expiry/nbf timestamps before the request is allowed. |
| Demo identity provider | `DemoIdentityProvider`/`DemoIdentityController` — an embedded, in-memory IdP that mints RS256 tokens for development. Activated only by the `dev` and `docker` profiles; never in production. |
| `JWT_ISSUER_URI` / `JWT_AUDIENCE` | Environment variables that supply the expected issuer and audience (overriding the property defaults). |
| `DEMO_USERNAME` / `DEMO_PASSWORD` | Environment variables for the demo login credentials; default username `demo-user`, password empty unless set. |
| Ownership scoping | The pattern where a resource is only visible if its `customerId`/`sub` matches the caller's; a mismatch returns `404` (not `403`) so callers cannot detect other customers' resources. |
| `X-Correlation-Id` | Request header used to trace a single request across services. |
| `401 Unauthorized` / `403 Forbidden` / `404 Not Found` | `401` invalid/missing token; `403` authenticated but missing a required scope; `404` resource absent or owned by another customer. |
| `TestJwtSupport` | Test helper that mints and validates real RS256 tokens offline (test-only key), letting tests exercise the full JWT security chain without a network IdP. |
| `app.cors.allowed-origins` | Comma-separated browser origins allowed through CORS; must be non-empty, or startup fails. |

## Messaging (Kafka)

| Term | Meaning in this repo |
| --- | --- |
| Kafka | Distributed event broker used to decouple order creation from summary projection. |
| Topic | A named event stream; streams live in `kafka.topics.*`. The primary topic is `order-created`. |
| Producer / Consumer | Producer publishes events (order-service); consumer reads them (summary-service). |
| Partition | A topic is split into ordered partitions; same-key events land in the same partition to preserve order. |
| Event sourcing | order-service persists the sequence of facts about an order (`OrderEventStore`) rather than only a mutable state, enabling replay/audit. |
| Retry / dead letter | `order-created-retry` and `order-created-failed` topics support retrying consumers and quarantining events that cannot be processed. |
| kafka-init | A one-shot compose container that creates the topics before consumers start. |
| Idempotency | Ensuring processing the same event twice produces the same result (events are keyed to prevent double-counting). |

## Data & Storage

| Term | Meaning in this repo |
| --- | --- |
| PostgreSQL (Postgres) | The production-grade database used by the `docker`/`prod` profiles (one database per service: `cart-db`, `order-db`, `product-db`, `summary-db`). |
| H2 | Embedded in-memory database used by the `dev` and `test` profiles for zero-setup local development and tests. |
| `ddl-auto` | Hibernate schema-management policy; `update`/`create-drop` in dev/test, controlled migrations in production. |
| Repository | Spring Data JPA repository; the data-access entry point for an aggregate. |
| Aggregate | A domain object with a transactional boundary (e.g. `Cart`, `Order`) loaded and saved as a whole. |

## Domain & Business

| Term | Meaning in this repo |
| --- | --- |
| Customer | A signed-in user, identified by the JWT `sub` claim and stored as `customerId` on their data. |
| Cart / Cart item | A customer's pending selection of products with quantities (`POST /cart`, `/cart/{cartId}/items`). |
| Product / Stock | Catalogue entry with price and available quantity; checkout reserves stock and rejects insufficient stock (`InsufficientProductStockException`). |
| Checkout | `POST /checkout` — converts a verified, non-empty cart into an order and publishes the `order-created` event. Empty carts are rejected (`EmptyCartException`). |
| Order | A confirmed purchase with line items, total, status, and owner. Statuses: `PENDING`, `COMPLETED`, `CANCELLED` (`OrderStatus`). |
| Receipt | A customer-facing order summary served by summary-service (`/summary/orders/{orderId}/receipt`). |
| Summary / Trends | Read-side aggregates (per-customer totals, product trends) recomputed from order events. |
| Query by ownership | Every customer- scoped read (`/api/me/*`, `/summary`) filters by the caller's identity so users only ever see their own data. |

## Environments & Profiles

| Term | Meaning in this repo |
| --- | --- |
| `test` profile | H2 + offline real JWT validation (`TestJwtSupport`); used by `mvn test` and the CI `test` job. |
| `dev` profile | H2 + embedded demo IdP on each service's own port; used for local development. |
| `docker` profile | Postgres via compose + embedded demo IdP (or `JWT_ISSUER_URI` when supplied); used by the CI `health-check` smoke stack. |
| `prod` profile | Postgres; external IdP required, demo disabled, and startup fails fast if `JWT_ISSUER_URI`/`JWT_AUDIENCE` are missing. |
| Fail-fast | Startup aborts immediately when required configuration is missing, instead of starting half-configured. |

## Tooling & Deployment

| Term | Meaning in this repo |
| --- | --- |
| Spring Boot / Maven | Java 21 apps built with Maven in a multi-module reactor (`pom.xml` at root + per-service modules). |
| Docker / docker-compose | Container runtime and local orchestrator; each service ships a Dockerfile and runs as a container. |
| GitHub Actions | CI in `.github/workflows/microservices-ci.yml`: `test` builds and unit/integration tests; `health-check` boots the compose smoke stack and asserts `/actuator/health` returns `UP`. |
| Actuator | Spring Boot metrics/health endpoints: `/actuator/health`, `/actuator/info`, `/actuator/prometheus`. |
| Swagger UI | Browsable API docs exposed per service (`{port}/swagger-ui.html`). |
| Terraform / ECS | Infrastructure-as-code (`terraform/`) provisioning AWS resources; services run on ECS (Fargate) in production, with images stored in ECR. |
| ECR | AWS Elastic Container Registry; stores the service images that ECS deploys. |