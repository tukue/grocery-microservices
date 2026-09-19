# Frontend Integration Contract

## Scope

This repository contains backend services only. A frontend must be maintained in a separate repository or added through a separately approved implementation. This document is the handoff contract between frontend, backend, product, and platform teams; it does not imply that a browser client already exists here.

## Browser-to-Backend Model

The frontend calls the public ALB/API base URL over HTTPS. It sends a bearer token for every protected request and treats all server responses as authoritative for prices, stock, cart state, order state, and receipts.

```text
Frontend runtime configuration -> HTTPS API base URL -> ALB -> microservice route
```

The browser must have only public runtime values, for example `PUBLIC_API_BASE_URL`. JWT signing keys, database credentials, Kafka credentials, and service-to-service URLs must never be included in frontend build output.

## Local MVP Setup

1. Set `CORS_ALLOWED_ORIGINS` to the exact frontend origin, then run `docker compose -f microservices/docker-compose.yml up --build`.
2. Configure the frontend with the service URLs: product `http://localhost:8083`, cart `http://localhost:8081`, order `http://localhost:8082`, and summary `http://localhost:8084`.
3. For a deployed frontend, set `CORS_ALLOWED_ORIGINS` to its exact HTTPS origin before starting the services. Do not use `*`.

The MVP uses the existing service URLs directly. Add an API gateway or generated frontend SDK only when the frontend needs a stable single-host API boundary or the number of clients makes duplicated request code costly.

## Current API Mapping

| User capability | HTTP operation | Backend owner | Frontend behavior |
| --- | --- | --- | --- |
| Browse catalogue | `GET /products` | Product | Render server price and availability. Public, no token needed. |
| Search catalogue | `GET /products/search?name=` | Product | Debounce input and handle empty results. |
| Load current cart | `GET /api/customer/cart` | Cart | Load the authenticated customer's current cart; create one when the API returns `404`. |
| Create cart | `POST /api/customer/cart` | Cart | Create a cart only when no current cart exists; retain the returned ID only as page state. |
| View cart | `GET /api/customer/carts/{cartId}` | Cart | Render the returned canonical cart. |
| Add item | `POST /api/customer/cart/{cartId}/items` | Cart | Replace local cart state with the response. |
| Change quantity | `PATCH /api/customer/cart/{cartId}/items/{itemId}` | Cart | Use the returned cart; do not calculate stock or totals locally. |
| Remove item | `DELETE /api/customer/cart/{cartId}/items/{itemId}` | Cart | Use the returned cart. |
| Checkout | `POST /api/customer/checkout` | Order | Disable duplicate submission and render the returned order confirmation. |
| View orders | `GET /api/customer/orders` and `GET /api/customer/orders/{id}` | Order | Show only orders belonging to the authenticated customer. |
| Update order status | `PATCH /api/customer/orders/{id}/status` | Order | Restrict this control to the product-approved user role/flow. |
| Load summary | `GET /api/customer/summary` | Summary | Render aggregate totals and recent orders for the authenticated customer. |
| View a known receipt | `GET /api/customer/summary/orders/{orderId}/receipt` | Summary | Render a text/print receipt; `404` if the receipt is not ready or not owned by the customer. |

The authoritative endpoint list remains in [API Documentation](api-documentation.md). The frontend client should be generated from published OpenAPI documents once those documents are made part of CI.

## Receipt Availability Behavior

Checkout returns an order, while summary projection is asynchronous through Kafka. The frontend should display **Order confirmed** immediately after successful checkout, then poll `GET /api/customer/summary/orders/{orderId}/receipt` with bounded retries when the customer wants a receipt. A `404` means the summary is still pending or the order is not owned by the customer; it is not a checkout failure. Do not poll Kafka or an internal event-store table from the browser.

## Authentication and CORS

- The `/auth/login` endpoints served by each service are explicitly demo authentication for the `dev` profile only; production requires an approved identity provider configured with `JWT_ISSUER_URI` and `JWT_AUDIENCE`.
- Use a single frontend API client to attach `Authorization: Bearer <token>` to protected calls.
- On `401`, clear the local session and return to sign-in. On `403`, keep the session but show a permission message. Do not retry either automatically.
- Backend CORS policy must allow only configured frontend origins, methods, and headers per environment. Wildcard production origins and browser-stored long-lived secrets are not acceptable.
- Prefer an httpOnly, secure, SameSite cookie session only if the selected identity provider and deployment model support it; otherwise document token storage and renewal risk explicitly.

## Error and State Model

The frontend needs one typed error adapter for the backend's JSON error responses.

| Response | User experience | Client action |
| --- | --- | --- |
| `400` | Explain invalid input beside the relevant field | Do not retry. |
| `401` | Ask the customer to sign in again | Clear session. |
| `403` | Explain that the action is not allowed | Do not retry. |
| `404` | Show missing or removed resource state | Navigate safely. |
| `409` | Explain stock/order-state conflict and refresh server data | User decides next action. |
| `503`/network failure | Show retryable unavailable state | Bounded user-initiated retry. |

Use server response data after every cart mutation. Optimistic quantity updates are allowed only when they are reverted on a failed response and are never used as a trusted total.

## Frontend Delivery Checklist

1. Generate or verify TypeScript types from the published OpenAPI documents.
2. Implement an API client with a runtime base URL, auth header, correlation-ID support, timeout, and typed error mapping.
3. Build product, cart, checkout, order-confirmation, and receipt-pending views as one vertical slice.
4. Add accessible loading, empty, validation, authorization, conflict, and unavailable states.
5. Add end-to-end tests against Docker Compose or staging for browse, cart quantity update, checkout, duplicate-submit protection, expired token, out-of-stock conflict, and eventual receipt availability.
6. Add frontend CI for linting, type checking, unit tests, dependency scanning, and a smoke browser test.
7. Release immutable frontend builds with backend-compatible API version metadata and a rollback path.

## Acceptance Scenario

```text
Given an authenticated customer and available product
When the customer creates a cart, adds an item, changes its quantity, and checks out
Then the UI displays the server-returned cart and order total
And checkout creates only one order when the button is pressed repeatedly
And the UI displays order confirmation before summary generation completes
And the receipt becomes available through the documented order-to-summary contract
```

## Ownership

- **Frontend team:** browser state, accessibility, UX states, API client, and browser tests.
- **Backend team:** OpenAPI contracts, authorization, trusted calculations, stable error codes, CORS configuration, and the order-to-summary lookup contract.
- **Platform team:** frontend hosting, CDN/TLS, environment runtime configuration, secrets, observability, and release promotion.
- **Product team:** acceptance criteria, allowed order status actions, and receipt availability expectation.

## Integration Best Practices

### Contract First

- Backend publishes OpenAPI docs before frontend implements.
- Frontend generates types from the contract, not hand-writes them.
- Both sides agree on error shapes before coding.

### One Error Shape

Backend returns consistent JSON for all errors:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation Failed",
  "path": "/products",
  "validationErrors": { "name": "Must not be blank" }
}
```

Frontend has one error adapter that maps status codes to user messages (see Error and State Model above).

### Server is Authoritative

- Never calculate totals, stock, or prices client-side.
- Use the response the backend returns.
- Optimistic updates are OK only if they revert on failure.

### Auth Token Pattern

```
Frontend stores token (httpOnly cookie or memory)
  → Attaches Authorization: Bearer <token> to every request
  → Backend validates JWT, extracts customer from sub claim
  → Backend forwards token to downstream services
```

Never hardcode tokens. Never expose signing keys in frontend builds.

### Idempotency for Mutations

- Checkout uses `Idempotency-Key` header or body field.
- Duplicate clicks return the same order, not a new one.
- Backend deduplicates by user + key.

### CORS Configuration

- Never use `*` in production.
- Allow only your exact frontend origin.
- Allow only necessary methods and headers.

### Response Handling

- Always read the response body on success, not just on error.
- Use the returned data, don't assume what you sent is what was stored.
- Backend may add fields (id, timestamps, calculated totals).

### Loading and Error States

Every data-fetching component must handle:

```
loading  → spinner or skeleton
success  → render data
error    → user-friendly message + retry option
empty    → empty state with call to action
```

### Request Validation

- Frontend validates form input before sending (Zod, react-hook-form).
- Backend validates everything again (never trust the client).
- Both sides use the same validation rules.

### Race Conditions

- Disable submit buttons while request is in flight.
- Use refs to prevent concurrent requests.
- Cancel stale requests when component unmounts.

### Cache and Freshness

- Product catalog: can be cached briefly.
- Cart: always fetch fresh from backend.
- Orders: always fetch fresh from backend.
- Receipt: poll with bounded retries (async projection).

### API Versioning

- Backend versions APIs in the URL path or header.
- Frontend pins to a specific version.
- Never make breaking changes without a new version.

### Logging and Correlation

- Frontend sends `X-Correlation-Id` header on every request.
- Backend logs correlation ID across all service calls.
- Enables tracing a request through microservices.

### Timeout and Retry

- Frontend sets fetch timeout (10–30 seconds).
- Backend sets connect/read timeouts on downstream calls.
- Retry only idempotent operations (GET, PATCH, DELETE with same params).
- Never retry non-idempotent operations (POST checkout) without idempotency key.

### Security Checklist

- No secrets in frontend build output.
- Token stored securely (httpOnly cookie > memory > localStorage).
- HTTPS everywhere in production.
- Backend validates JWT signature, issuer, audience, expiry.
- Backend enforces scope-based authorization per endpoint.
