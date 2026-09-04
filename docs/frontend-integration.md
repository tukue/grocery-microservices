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
| Browse catalogue | `GET /products` | Product | Render server price and availability. |
| Search catalogue | `GET /products/search?name=` | Product | Debounce input and handle empty results. |
| Create cart | `POST /carts` | Cart | Store only the returned cart ID in client state. |
| View cart | `GET /carts/{cartId}` | Cart | Render the returned canonical cart. |
| Add item | `POST /carts/{cartId}/items` | Cart | Replace local cart state with the response. |
| Change quantity | `PATCH /carts/{cartId}/items/{itemId}` | Cart | Use the returned cart; do not calculate stock or totals locally. |
| Remove item | `DELETE /carts/{cartId}/items/{itemId}` | Cart | Use the returned cart. |
| Checkout | `POST /orders/checkout` | Order | Disable duplicate submission and render the returned order confirmation. |
| View orders | `GET /orders` and `GET /orders/{id}` | Order | Show only orders belonging to the authenticated customer. |
| Update order status | `PATCH /orders/{id}/status` | Order | Restrict this control to the product-approved user role/flow. |
| Poll summary by order | `GET /summaries/by-order/{orderId}` | Summary | Treat `404` as pending summary generation and retry with a bounded poll. |
| View a known summary | `GET /summaries/{id}` | Summary | Render the summary read model. |
| View a known receipt | `GET /summaries/{id}/receipt` | Summary | Render a text/print receipt. |

The authoritative endpoint list remains in [API Documentation](api-documentation.md). The frontend client should be generated from published OpenAPI documents once those documents are made part of CI.

## Receipt Availability Behavior

Checkout returns an order, while summary creation is asynchronous through Kafka. The frontend should display **Order confirmed** immediately after successful checkout, then poll `GET /summaries/by-order/{orderId}` with bounded retries. A `404` means the summary is still pending; it is not a checkout failure. Do not poll Kafka or an internal event-store table from the browser.

## Authentication and CORS

- The current `/auth/login` endpoints are explicitly demo authentication and must be replaced by an approved identity provider or production authentication service before release.
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
