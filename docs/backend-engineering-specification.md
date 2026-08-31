# Backend Engineering Specification

## Purpose

Use this living guide when implementing a customer-facing backend feature in this Spring Boot microservices repository. It favors small, complete vertical slices over broad architectural changes.

Update it after meaningful implementation or review lessons so future work follows proven repository-specific practices.

## Current Practices in This Repository

- Spring Boot services use DTOs at API boundaries, constructor injection, service-layer business rules, Spring Data repositories, and centralized exception handlers.
- Request payloads use Bean Validation for required IDs, positive quantities/prices, and non-negative inventory values.
- Cart and order resources persist a customer owner and enforce it from the authenticated JWT principal for reads and mutations.
- Checkout obtains cart snapshots through an explicit client, derives order totals server-side, and stores immutable order lines.
- Product-service owns catalog availability and stock; cart-service rejects unavailable or insufficient-stock additions.
- Service URLs and timeouts are environment-configured; localhost defaults are avoided for service-to-service deployment configuration.
- Downstream errors are mapped to customer-safe HTTP responses rather than exposing internal exceptions.
- Service and controller tests cover both successful flows and rejected persistence/authorization paths.

## Core Skill: Build Trusted Customer Flows

For every feature, trace the complete path:

```text
Validated request -> Controller -> Service rule -> Repository/downstream client -> Response -> Tests
```

Implement only the behavior required for the next MVP customer outcome. Avoid introducing infrastructure, abstractions, or distributed patterns before the flow demonstrates a need.

## Implementation Checklist

### 1. Start With the Business Rule

- Identify the customer action and the service that owns its data.
- State the definition of done before editing code.
- Confirm whether the client is allowed to supply each field; prices, totals, and user identities are normally server-derived.

### 2. Keep Controllers Thin

- Accept DTOs, validate them with `@Valid`, and derive the authenticated user from `Authentication`.
- Delegate business decisions to services.
- Return appropriate HTTP status codes through existing exception handling.
- Do not expose JPA entities or internal exceptions as API responses.

### 3. Put Rules in the Service Layer

- Keep transactional write operations in service methods.
- Validate ownership before reading or mutating customer resources.
- Apply state transitions explicitly, for example only `PENDING -> COMPLETED` or `PENDING -> CANCELLED`.
- Prevent persistence after a failed business rule or downstream dependency call.

### 4. Preserve Service Ownership

- `product-service` owns product identity, price, availability, and stock.
- `cart-service` owns customer carts and mutable quantities.
- `order-service` owns immutable order lines, trusted totals, and order state.
- `summary-service` owns receipt and reporting views.

Store copies of data only when required for an immutable business record, such as the product snapshot stored in an order line.

### 5. Secure Every Resource Operation

- Treat authentication and authorization as separate checks.
- Use the validated JWT principal, never a mutable customer ID supplied by the browser.
- Compare the principal to the persisted resource owner in the service layer.
- Apply ownership checks to reads and writes: get, list, update, delete, checkout, and status transitions.
- Return `403 Forbidden` when a caller does not own the resource.

### 6. Make Inter-Service Calls Safe

- Use a small, explicit client interface for each downstream dependency.
- Keep service URLs externalized through environment-specific configuration.
- Forward caller credentials only when the downstream service must authorize the same customer action.
- Configure bounded connect and read timeouts.
- Validate configured URLs and map downstream failures clearly:
  - missing resource: `404`
  - access denied: `403`
  - invalid business state: `409`
  - unavailable dependency: `503`

Do not add a service mesh, retry framework, event broker, or distributed transaction solely for an MVP flow.

### 7. Validate at API Boundaries

- Use Bean Validation annotations for required IDs, positive quantities and prices, and non-negative stock.
- Validate nested DTOs where required.
- Reject malformed input before calling repositories or downstream services.
- Keep validation messages useful to frontend developers and customers.

### 8. Test Behavior, Not Just Methods

Add the smallest useful test set for each feature:

- happy path;
- validation or business-rule rejection;
- ownership/authorization denial;
- persistence guard when an operation fails;
- relevant downstream failure.

Examples:

- A cart addition rejects an unavailable product or quantity above catalog stock.
- Checkout derives its total from cart snapshots rather than request data.
- One customer cannot update another customer's order status.
- A denied action never invokes repository `save`.

## Review Checklist

Before requesting review, confirm:

- The controller does not contain business rules.
- The service validates resource ownership for every mutation.
- Client-supplied financial data is ignored or removed.
- Exceptions map to consistent customer-safe responses.
- Remote calls have externalized URLs and bounded timeouts.
- Tests cover a main success path and meaningful failure paths.
- The affected module test suite passes.
- The improvement roadmap records the delivered MVP behavior and any deliberate follow-up work.

## MVP Decision Rule

Prioritize work in this order:

```text
Customer flow completion
-> Business correctness
-> Data integrity
-> Authorization and API quality
-> Tests
-> Infrastructure polish
```

Defer production-scale patterns unless they are necessary for the current customer flow to work correctly.
