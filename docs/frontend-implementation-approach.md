# Frontend Implementation Approach

This guide records the approach used for the customer journey frontend and its
security and reliability follow-up. Use it as a starting point for future
frontend work in this repository. Keep endpoint details in the relevant API
contracts; this document describes how to shape and deliver a feature.

Use [the Grove design system](../frontend/docs/design-system.md) as the visual
and interaction reference. It defines shared tokens, responsive layouts, the
shopping journey, and recovery states. Keep screens consistent with this guide
when extending the application.

## Start with the user journey and contracts

Describe the customer-visible path first, including its success and recovery
states. For a commerce change, trace the full path from product discovery
through cart mutation, checkout, confirmation, and order history. Map each step
to its owning API before building UI. Treat backend responses as authoritative
for identity, ownership, availability, prices, totals, and persisted order
state.

Check the existing backend API documentation and service behavior. Define the
request/response shapes, expected errors, authorization requirements, and
whether a mutation needs idempotency. Validate incoming response data at the API
boundary and keep transport DTOs out of domain and UI code.

## Keep responsibilities at clear boundaries

- React routes compose feature views; feature components own their user
  interactions and states.
- Feature API modules make requests and validate responses. Shared modules
  contain reusable primitives and must not depend on feature modules.
- The browser calls relative `/api` paths. The Express BFF owns session
  handling and service routing; browser components do not call microservices
  directly.
- Services remain authoritative. Replace local cart state with the response
  from each mutation, and reload confirmation and order history from persisted
  order endpoints.

The receipt BFF route returns JSON with `status: "ready"` and plain-text
`content`, or HTTP 202 with `status: "pending"`. A ledger 404 becomes pending
only after the order service verifies the customer's owned order. Keep order
status separate from receipt projection readiness, and bound browser polling
with an explicit retry action after the wait budget.

Follow the import and application boundaries in
[`frontend/docs/architecture.md`](../frontend/docs/architecture.md).

## Treat authentication as a server boundary

The browser receives only public session details and an opaque HttpOnly cookie.
Keep the upstream JWT in the server-side session store. Before creating a
session, verify the JWT signature using the configured issuer's JWKS and check
the allowed algorithm, issuer, audience, and expiration. Never trust claims
obtained by merely decoding a token.

Use Redis for runtime sessions so sessions survive process restarts and are
shared across BFF instances. Require `REDIS_URL` when starting the BFF. Keep an
in-memory store only as a test adapter. Configure Redis authentication,
encryption, backups, and monitoring for the deployment environment.

## Make checkout safe to retry

Generate an idempotency key in the frontend and retain it for the current cart
attempt. Keep the key when the result is ambiguous, so a retry cannot create a
second order. Clear or replace it only after a definite outcome. Browser storage
is untrusted input: parse defensively, validate the cart ID, key, and state, and
discard malformed or unexpected values. Disable duplicate submission while a
request is in flight, but rely on server idempotency for correctness.

After checkout, render the order returned by the service and use persisted
order endpoints when a confirmation or history page is reloaded. Do not rely on
in-memory navigation state as the only copy of an order.

## Build and test in vertical slices

Implement a complete user-visible slice in small steps:

1. Define the acceptance scenario and API contract.
2. Implement the API adapter and runtime validation.
3. Connect it to domain state and the route or component.
4. Add loading, empty, validation, unauthorized, conflict, and unavailable
   states relevant to the scenario.
5. Cover the behavior with focused unit or component tests, then exercise the
   customer flow in Playwright.

For isolated browser tests, mock only backend paths under `/api/`. A broad route
pattern can also match frontend module URLs such as
`/src/features/auth/api/auth-api.ts`; inspect the request pathname and pass
non-backend requests through to Vite. Keep browser fixtures stateful enough to
model session, cart, and order transitions, and return realistic status codes
and response shapes.

## Verify and deliver

Before handing off a feature, run the checks relevant to its changes:

```sh
npm run format
npm run lint
npm run type-check
npm test
npm run build
npm run test:e2e
```

Check the E2E environment requirements when browser tests cannot launch; CI
installs Playwright's browser and system dependencies. Review the final diff for
unrelated changes, ensure deployment configuration includes required runtime
settings such as `REDIS_URL` and JWT issuer/JWKS values, and document any
remaining operational work.

## Related documentation

- [Storefront BFF integration](Grocery_PR59_Integration_Spec.md)
- [Authentication and authorization](authentication-authorization.md)
- [Frontend integration contract](frontend-integration.md)
- [Cart API](frontend-cart-api.md)
- [Order API](frontend-order-api.md)
