# Implementation guide

Use this guide when extending or fixing the grocery application. Start with the
[current architecture](architecture-overview.md) and
[current frontend implementation](../frontend/docs/current-implementation.md).
Those documents describe existing behavior; this guide describes how to build on it.

## 1. Define the customer outcome

Describe the customer action, successful result, and relevant failure states before
editing code. Check the current API contract and choose the service that owns the
rule. Record missing contracts explicitly instead of adding UI promises for
unsupported behavior.

The current journey is catalogue → product details → sign-in → cart → checkout
review → persisted confirmation → receipt and order history. Payment, delivery,
and favourites require additional implementation and contracts.

## 2. Follow the ownership boundaries

| Change | Implementation location |
| --- | --- |
| Navigation and shared layout | `frontend/src/routes.tsx`, `frontend/src/app/store-layout.tsx` |
| Feature UI, domain mapping, API validation | `frontend/src/features/<feature>` |
| Shared browser utilities and components | `frontend/src/shared` |
| Session and upstream routing | `frontend/server/bff.ts`, `proxy.ts`, `session-store.ts` |
| Catalogue, pricing, availability, stock | `microservices/product-service` |
| Cart selections, resource ownership, cart state | `microservices/cart-service` |
| Checkout, recorded orders, event intent | `microservices/order-service` |
| Order projections and receipts | `microservices/ledger-service` |

Browser components call relative `/api` routes through feature adapters. Keep
transport DTOs at API boundaries and validate incoming responses. Cross-feature
imports use public feature entrypoints; shared modules do not import features.
Backend controllers handle validated requests, services own business rules, and
repositories own persistence access.

## 3. Implement a complete slice

1. Define or confirm request/response shapes and expected status codes.
2. Implement the owning backend rule and authorization checks when needed.
3. Add the explicit BFF route and response adaptation when needed.
4. Validate and map browser API responses into feature domain data.
5. Connect the route, state, and UI using shared design patterns.
6. Handle loading, empty, validation, unauthorized, conflict, and unavailable
   outcomes relevant to the action.
7. Verify the customer result and meaningful failure paths.

Avoid trusting browser-supplied identity, prices, totals, or product snapshots.
Resource ownership must be enforced by the backend even when the UI has a route
guard. Keep upstream JWTs in the server-side session store.

## 4. Preserve state and integration guarantees

- Session changes invalidate private frontend data. Ignore stale responses from
  earlier sessions and older refresh requests.
- Cart mutations retain the shared lock and use server-confirmed state. Disable
  each pending line's controls using its item ID and block checkout while a
  mutation is pending. Restore or reload state after an optimistic failure.
- Checkout retains the idempotency key when the outcome is ambiguous. Prevent
  duplicate submission and load confirmation from the persisted order.
- Persist order-event intent with the order. Preserve relay retry/lease behavior
  and idempotent ledger processing; do not claim exactly-once transport delivery.
- Treat receipt readiness separately from order success. Only return pending
  after verifying the owned order; bound polling and provide explicit retry.
- Preserve applied Flyway migrations. Add a new migration for schema changes and
  check retained data and constraints on upgrades.

## 5. Keep the frontend consistent

Follow [the design system](../frontend/docs/design-system.md),
[frontend boundaries](../frontend/docs/architecture.md), and
[frontend implementation approach](frontend-implementation-approach.md).

Use “cart” consistently and concise professional wording. Reuse existing colors,
spacing, controls, and responsive layouts. Provide visible labels, keyboard focus,
status feedback, and recovery actions. Do not invent currencies, stock, discounts,
payment results, delivery promises, or unsupported account capabilities.

## 6. Verify the affected behavior

Choose checks appropriate to the change. For frontend behavior, use relevant
component/API tests and browser journeys, plus formatting, lint, type checking,
and build checks. Stateful browser fixtures must intercept only `/api` requests.
Keep fixture-based verification distinct from real backend/Kafka integration.

```sh
# From frontend/
npm run format
npm run lint
npm run type-check
npm test
npm run build
npm run test:e2e

# From repository root for backend/integration changes
mvn -B verify -Dspring.profiles.active=test
```

Follow [local setup](../frontend/README.md) for required services and configuration.
Do not skip failing code tests or disable schema validation to hide failures.
For Markdown-only changes, check content accuracy, links, and `git diff --check`;
application test runs are unnecessary.

## 7. Document and deliver

Update the current implementation documents when routes, contracts, state rules,
or service behavior change. Update the design system when a shared visual or
language convention changes. Keep proposed work in roadmap documents instead of
presenting it as implemented behavior.

Review the diff for unintended changes, record the checks actually executed and
remaining limitations, then commit and push to the active PR source branch when
authorized. A passing local test does not establish production readiness or a
successful deployment.

For additional backend guidance, read [BACKEND_SKILL.md](../BACKEND_SKILL.md).
