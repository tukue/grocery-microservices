# Grocery Microservices: Pending Frontend/Backend Integration Specification

Reviewed: 21 September 2026
Baseline: PR #59, "Feature/frontend cart", merged into main.
Commit reviewed: `8dd66f6583a837af67571d1f0d92047b66dcc5ca`
PR: https://github.com/tukue/grocery-microservices/pull/59

---

## Goal and Review Limits

Deliver a real authenticated customer journey:

> Browse products -> Add items -> Edit cart -> Submit order -> Reload persisted confirmation -> View order history.

This specification is based on the PR metadata, changed files and selected patches, and the merged frontend, backend controllers, DTOs, checkout service, configuration and tests. Main pointed to the PR merge commit at review time. Findings are static code observations; no application, build or tests were run. "Pending" means missing or disconnected in the reviewed paths, not that all related code is absent. Recheck the baseline before implementation.

---

## Current Implementation and Confirmed Gaps

| Area | Existing Foundation | Remaining Integration |
|------|--------------------|-----------------------|
| **Runtime** | React, TypeScript, Vite scripts and React Router dependency | `main.tsx` renders the starter `App.tsx`. Shopping routes are not mounted. Next.js app routes, server actions and server-only modules coexist with a package manifest that lacks Next.js. |
| **Product catalogue** | Product controller supports list, detail, search and paginated list; frontend adapters/components exist | Mount the catalogue and connect it to real data. Avoid assuming array and page responses are interchangeable. |
| **Cart** | Backend supports current/create/add/update/remove; frontend `CartAdapter` and components exist | `CartPage` renders `CartItem` without mutation callbacks. Connect quantity/removal and shared cart state across screens. |
| **API routing** | Vite proxies `/products` to 8083 and all `/api` requests to 8081 | Compose exposes cart on 8081 and order on 8082. Checkout/order requests need separate routing. `/products` is also a desired UI route, so document a distinct browser API namespace. |
| **Authentication** | Backend scope/ownership enforcement and an existing cookie-based cart server-action approach | Production session flow is explicitly pending in `docs/frontend-backlog.md`. Other adapters accept browser bearer tokens; checkout server code only forwards an incoming `Authorization` header. Select one consistent approach. |
| **Checkout** | Backend already reserves stock, creates order snapshots, claims carts, supports idempotent replay and compensation attempts | Storefront uses hard-coded product 12/cart 42 and local state. Checkout paths and error models differ across adapters. Generate retry keys internally. |
| **Confirmation** | A React Router confirmation component exists | It prints the route ID and "Order Confirmed" without retrieving an owned order. |
| **Quality gates** | Frontend CI runs format/lint/type-check/unit tests/build | Vitest selects only `__tests__` files; colocated API/shared/app tests are excluded. TypeScript uses an explicit include list. Playwright is absent from package dependencies/scripts and CI; its config expects port 3000 while Vite has no explicit matching port. |

---

## Implementation Constraints

1. **Reuse existing endpoints.** Do not rebuild cart CRUD, checkout, stock reservation or order ownership from scratch.

2. **Retain React and strict TypeScript.** Keep feature UI, API transport, schema validation and domain mapping separate.

3. **Proposed architecture:** Complete the active Vite + React Router frontend, backed by a same-origin backend-for-frontend (BFF) for session handling and service routing. If Next.js is the intended target, replace the first task with an explicit migration; do not maintain two production application entry paths.

4. **Tokens remain server-side** behind an HttpOnly session cookie in the proposed BFF design. Never embed credentials in frontend environment variables.

5. **Reuse validated response schemas.** Preserve one canonical DTO-to-domain mapping per resource. Components must not make ad hoc service requests.

6. **Cart/customer identity, prices, totals and order status remain server-authoritative.** The current cart DTO has no total: a client display estimate may be derived from returned item prices; the saved order total is authoritative.

7. **Keep existing compatible service contracts.** Introduce database migrations only for required backend changes.

8. **Out of scope:** No payment provider, shipping/address workflow, promotions, admin interface or infrastructure migration in this integration milestone.

9. **Reviewability.** Each task is a small reviewable PR with focused verification. Do not hide live application code from checks to obtain a passing build.

---

## API Contract to Preserve

Browser-facing BFF routes below are proposed; service routes are verified existing routes. Separate the UI `/products` route from JSON traffic.

| Operation | Proposed Browser Route | Existing Service Route | Target |
|-----------|----------------------|----------------------|--------|
| Catalogue | `GET /api/catalog/products` | `GET /products` | Product |
| Search | `GET /api/catalog/products/search?name=...` | `GET /products/search?name=...` | Product |
| Product detail | `GET /api/catalog/products/{id}` | `GET /products/{id}` | Product |
| Current cart | `GET /api/customer/cart` | Same | Cart |
| Create cart | `POST /api/customer/cart` | Same | Cart |
| Add line | `POST /api/customer/cart/{cartId}/items` | Same | Cart |
| Update quantity | `PATCH /api/customer/cart/{cartId}/items/{itemId}` | Same | Cart |
| Remove line | `DELETE /api/customer/cart/{cartId}/items/{itemId}` | Same | Cart |
| Checkout | `POST /api/customer/checkout` | Same | Order |
| Order list/detail | `GET /api/customer/orders[/{id}]` | Same | Order |

### Payload Contracts

- **Add payload:** `{productId, quantity}`
- **Update payload:** `{quantity}`
- **Checkout payload:** `{cartId, idempotencyKey}`; key maximum 64 characters.
- Never send client-computed prices or a customer ID to establish ownership.

### Response Contracts

- **Cart response:** `{id, status, items: [{id, productId, productName, price, quantity}]}`
- **Order response:** `{id, userId, cartId, status, orderDate, total, orderLines: [{productId, productName, unitPrice, quantity, lineTotal}]}`
- **Order status:** `PENDING`, `COMPLETED` or `CANCELLED`. Do not confuse successful submission with payment or fulfilment completion.

### Port Mapping

Use `cart`/`cart` and `order`/`order` as appropriate. Public catalogue behaviour must match Product security configuration. In Compose, host ports are product 8083, cart 8081, order 8082; container service ports are 8080. Do not mix these with standalone service defaults.

---

## P0: Tasks Required for a Working Journey

### INT-01: Activate One Application Runtime and Route Tree

**Ownership:** Frontend
**Dependencies:** None

Implement `/products`, `/cart`, `/checkout`, `/confirmation/` and `/orders`; redirect `/` to `/products`. Mount the router and shared layout from the actual entry point. Consolidate duplicate component families and migrate reusable Next.js-dependent logic into the selected runtime before removing obsolete paths. Align runtime aliases, scripts and deployment fallback.

**Acceptance:**

- [ ] Starting the documented dev command displays the catalogue shell instead of the starter screen.
- [ ] Direct navigation and reload work on all routes, including confirmation.
- [ ] Production serving returns the application for UI routes and preserves JSON API routes.
- [ ] Live source is type-checked and bundled without unresolved `next/*` or `server-only` dependencies in the browser.
- [ ] Document the runtime choice and one start/build procedure.

---

### INT-02: Implement Service Routing and a Canonical API Boundary

**Ownership:** BFF/backend integration + frontend
**Dependencies:** INT-01 architecture decision

Create explicit product/cart/order routing and update feature adapters. Preserve status codes, validation errors, correlation headers and idempotency keys. Validate response JSON at the boundary; map DTOs once. Configure service URLs per environment.

**Acceptance:**

- [ ] A route smoke test proves catalogue, cart and checkout reach the intended services.
- [ ] `/products` renders HTML; `/api/catalog/products` returns JSON.
- [ ] One checkout path is used by the application; obsolete `/api/orders/checkout` callers are removed or deliberately mapped.
- [ ] 204 responses are handled without JSON parsing; malformed successful responses become controlled errors.
- [ ] A returned order is validated as a service DTO before mapping. If a BFF returns a domain object, its client schema matches that object rather than requiring stripped `userId`.
- [ ] Production requests work independently of Vite's development-only proxy.

---

### INT-03: Complete Customer Authentication and Session Lifecycle

**Ownership:** BFF/backend + frontend
**Dependencies:** INT-02

Implement provider-based sign-in, sign-out and session retrieval. Use the existing backend JWT validation rather than building another identity database. Choose and document the provider configuration. The BFF resolves the session and forwards the correct bearer token to cart and order services.

**Acceptance:**

- [ ] A signed-in customer can read/write their cart and submit/read orders.
- [ ] Missing/expired sessions produce a sign-in action; refreshing or signing out clears customer-specific frontend caches.
- [ ] Cookies have `HttpOnly`, production `Secure` and an appropriate `SameSite` policy; mutation endpoints enforce CSRF/origin protection for the deployment.
- [ ] Expiry/refresh failure returns a controlled 401 without retry loops.
- [ ] Two-customer tests deny cross-customer cart and order access.
- [ ] Browser code, logs and localStorage contain no access/refresh tokens.
- [ ] Local demo identity remains explicitly local/test-only; production startup does not silently enable it.

---

### INT-04: Connect Catalogue and Add-to-Cart

**Ownership:** Frontend
**Dependencies:** INT-02, INT-03 for mutations

Mount real product list/search and use the existing add-cart operation. Remove sample product/cart IDs from the customer flow. Use existing pagination or clearly scoped list behaviour; do not silently discard page metadata.

**Acceptance:**

- [ ] Backend seed changes are reflected in catalogue names, prices and availability.
- [ ] Search displays loading, empty, error and retry states; stale responses cannot overwrite newer searches.
- [ ] Add-to-cart retrieves the current cart and creates one only for the expected not-found case.
- [ ] Unavailable products cannot be added from the UI; server rejection remains authoritative.
- [ ] Successful add updates the shared cart count; failure does not show a false success.
- [ ] Public browsing, where permitted, remains usable before sign-in.

---

### INT-05: Complete Persistent Cart Editing

**Ownership:** Frontend; backend only if verified integration defects arise
**Dependencies:** INT-04

Wire existing quantity/removal components and helpers into `CartPage`. Use a shared cart store or query cache consumed by the header, cart and checkout. Apply returned server cart state after each mutation.

**Acceptance:**

- [ ] Add, change quantity and remove persist after reload.
- [ ] Quantity must be a positive integer; invalid input makes no mutation request.
- [ ] Requests use cart item IDs for update/removal, not product IDs.
- [ ] Pending controls prevent duplicate operations on the same line.
- [ ] Failed changes retain or restore the last confirmed state and display an actionable error.
- [ ] A 409 refreshes the authoritative cart and asks the customer to review; it does not silently repeat a mutation.
- [ ] Empty cart disables checkout. Signing out or switching customers clears the previous cart view.

---

### INT-06: Connect Reliable Checkout

**Ownership:** Frontend + order integration
**Dependencies:** INT-03, INT-05

Submit the real current cart through the canonical checkout adapter. Replace the visible "Order reference" idempotency input with an internally generated key. Keep one key per logical submission, including retries after an ambiguous timeout.

**Acceptance:**

- [ ] Empty or already checked-out carts cannot be submitted as new orders.
- [ ] Double-clicking produces one logical checkout; retries with the same key resolve to the same persisted order.
- [ ] The retry key survives navigation/reload while the attempt is unresolved; a changed cart starts a new reviewed attempt.
- [ ] Disable submit while pending, but release the UI lock on a handled failure.
- [ ] Handle 400/422 field validation, 401 session expiry, 403 permission denial, 404 missing cart, 409 cart/stock conflicts and 503 dependency outage distinctly.
- [ ] On timeout, offer recovery with the same key; do not clear the cart or report definitive failure/success without evidence.
- [ ] Navigate only after a validated success response. Refresh cart state from the backend after success.
- [ ] Display persisted order lines/total and `PENDING` status without implying payment completion.

---

### INT-07: Retrieve Real Order Confirmation

**Ownership:** Frontend
**Dependencies:** INT-06

Fetch `GET /api/customer/orders/{id}` for confirmation, including direct URL visits. Add a read-order adapter using the canonical session and error handling.

**Acceptance:**

- [ ] Confirmation shows stored order ID, date, status, lines and total.
- [ ] Reloading and opening the URL in a new tab reproduce the persisted order.
- [ ] Unknown, malformed or unowned IDs never render a success message.
- [ ] Loading, session expiry and retry states are accessible.
- [ ] Confirmation uses the order snapshot even if the catalogue or current cart changes.

---

### INT-08: Make Integration Verification Representative

**Ownership:** Frontend + backend test/CI
**Dependencies:** Implement alongside INT-01 through INT-07; release gate after INT-07

Unify Vitest discovery, type-check inclusion and fixtures. Restore Playwright dependency/scripts and align its server URL/port with the chosen runtime. Keep fast mocked tests and add a separate real-service journey.

**Acceptance:**

- [ ] CI runs `npm ci`, format, lint, complete application type-check, unit/component tests and build.
- [ ] Colocated cart/product/order/shared tests are discovered, or intentionally migrated with documented replacements.
- [ ] Repair the existing checkout browser test so its assertions match the actual confirmation flow.
- [ ] A real-service test signs in, lists seeded products, adds two lines, updates one, removes one, checks out and reloads confirmation.
- [ ] A second customer cannot access the first customer's order.
- [ ] A stock conflict and a timed-out response/retry are covered without duplicate orders or false success.
- [ ] The real-service test does not intercept checkout with a fake success response.
- [ ] CI retains failure traces and uses isolated/resettable test data.

---

## P1: Follow-Up Features

### INT-09: Order History and Customer Cancellation

**Dependencies:** INT-07

Reuse `GET /api/customer/orders`; show newest first, empty/error states and links to detail.

Cancellation is a backend extension before enabling its UI: the reviewed `updateOrderStatus` method updates status but does not call stock-release logic. It also permits an owning customer with order to select `COMPLETED`; define whether completion is an operational action and enforce that policy server-side.

**Acceptance:**

- [ ] Order history contains only the signed-in customer's orders and survives reload.
- [ ] Only eligible `PENDING` orders expose cancellation.
- [ ] Cancellation changes status and restores reserved stock exactly once, including retries and concurrent requests.
- [ ] Failed compensation is durably retryable/reconcilable, not only logged.
- [ ] Customers cannot mark orders `COMPLETED` if completion is reserved for an operational role.

---

### INT-10: Catalogue Detail, Pagination and Sorting

**Dependencies:** INT-04

Connect existing `GET /products/{id}` and paginated `GET /products?page=&size=&sort=&direction=`.

**Acceptance:**

- [ ] Detail pages work on direct load with clear missing/unavailable states.
- [ ] Page, sort and search state are reflected in the URL and restored by browser navigation.
- [ ] UI handles array search results separately from paginated list results.
- [ ] Combined paginated search is a separate backend contract extension if needed; do not assume the existing search endpoint supports it.
- [ ] Changes to search reset paging and do not render stale results.

---

### INT-11: Checkout Concurrency and Recovery Hardening

**Dependencies:** INT-06

Extend and verify existing reservation/compensation code rather than replacing it.

**Acceptance:**

- [ ] Concurrent same-cart checkout yields one successful logical order.
- [ ] Reusing a key for a different cart/payload is rejected with a defined conflict, rather than returning an unrelated prior order.
- [ ] A transaction-commit failure after remote cart/stock operations is tested; recovery restores a consistent state.
- [ ] Failed stock release/cart reopening has a durable recovery mechanism and correlation ID.
- [ ] Reservation ownership is respected: a losing concurrent attempt cannot release the winning order's reservation.

These are follow-up verification/hardening requirements, not a claim that all concurrency failure modes have been reproduced.

---

## Delivery Order and Completion Criteria

```
INT-01 -> INT-02 -> INT-03 -> INT-04 -> INT-05 -> INT-06 -> INT-07
```

Apply INT-08 checks throughout and complete its real-service gate before release.
Then deliver INT-09/10; prioritize INT-11 before exposing checkout to production traffic.

A milestone is complete when:

1. A fresh checkout of the repository can start the documented stack.
2. A user can sign in, complete the real journey and reload persisted results.
3. Failures preserve accurate customer state.
4. CI verifies the same active application.

Update `docs/frontend-backlog.md` and frontend integration/API docs to reflect the chosen runtime and completed tasks.

---

## Sources

All source links are pinned to the reviewed commit.

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/features/orders/components/storefront.tsx`
- `frontend/src/features/cart/components/CartPage.tsx`
- `frontend/src/features/cart/api/cart-adapter.ts`
- `frontend/src/features/orders/components/checkout-form.tsx`
- `frontend/src/features/orders/components/confirmation-page.tsx`
- `frontend/src/features/orders/api/client-order-submission.ts`
- `frontend/src/features/orders/api/server-order-submission.ts`
- `frontend/src/app/api/orders/checkout/route.ts`
- `microservices/cart-service/src/main/java/com/grocery/microservices/cart/controller/CartController.java`
- `microservices/order-service/src/main/java/com/grocery/microservices/order/controller/OrderController.java`
- `microservices/order-service/src/main/java/com/grocery/microservices/order/service/OrderService.java`
- `microservices/product-service/src/main/java/com/grocery/microservices/product/controller/ProductController.java`
- `microservices/docker-compose.yml`
- `frontend/tsconfig.app.json`
- `frontend/vitest.config.mts`
- `frontend/e2e/checkout.spec.ts`
- `frontend/playwright.config.ts`
- `.github/workflows/frontend-ci.yml`
- `docs/frontend-backlog.md`
- `docs/frontend-order-api.md`
