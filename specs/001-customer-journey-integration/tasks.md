# Tasks: Authenticated Grocery Customer Journey

**Input**: Design documents from `/specs/001-customer-journey-integration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/browser-bff.openapi.yaml, quickstart.md

**Tests**: Required by FR-026 and the plan verification strategy. Write each listed test before its corresponding implementation and confirm that it fails for the intended missing behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independently demonstrable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an incomplete task in the same phase
- **[Story]**: Maps the task to US1, US2, US3, or US4 from spec.md
- Every task names the exact file or directory it changes

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the runtime and test dependencies needed by the planned Vite + standalone BFF architecture.

- [X] T001 Add Express, cookie-parser, http-proxy-middleware, tsx, concurrently, their required type packages, and Playwright scripts without changing the Node 24 baseline in frontend/package.json
- [X] T002 [P] Broaden test discovery to `src/**/*.{test,spec}.{ts,tsx}` and `server/**/*.{test,spec}.ts` while excluding `src/app-backup/**` and node_modules in frontend/vitest.config.mts
- [X] T003 [P] Configure separate BFF port 3000 and Vite port 5173 startup/readiness for browser tests in frontend/playwright.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the BFF, route allowlist, session boundary, and development topology used by every story.

**⚠️ CRITICAL**: Complete this phase before beginning user-story implementation.

- [X] T004 [P] Write route-resolution tests for all 14 browser operations and rejection of non-allowlisted paths in frontend/server/__tests__/proxy.test.ts
- [X] T005 [P] Write expiry, lookup, deletion, and cleanup tests for opaque sessions in frontend/server/__tests__/session-store.test.ts
- [X] T006 Implement the Session record in frontend/server/session-store.ts with the exact rules `id: Cryptographically random, unique, never reused, stored in cookie only`, `jwt: never returned to browser scripts`, `userId/email: derived from validated identity claims`, and `expiresAt: must not exceed upstream token validity`
- [X] T007 Replace fallback routing with an explicit method-and-path allowlist and upstream path transforms in frontend/server/proxy.ts
- [X] T008 Create the standalone Express application factory, JSON/error middleware, health endpoint, protected-route session lookup, bearer injection, upstream timeout, and controlled 502 handling in frontend/server/bff.ts
- [X] T009 [P] Add BFF startup with validated CART_SERVICE_URL, ORDER_SERVICE_URL, PRODUCT_SERVICE_URL, BFF_PORT, and cookie settings in frontend/server/config.ts
- [X] T010 Replace the development-only BFF plugin with a `/api` proxy to `http://localhost:3000` while keeping the client on port 5173 in frontend/vite.config.ts
- [X] T011 Wire `dev:server`, `dev:client`, combined `dev`, and production BFF commands to the new entry point in frontend/package.json

**Checkpoint**: The BFF starts independently, Vite forwards only `/api`, disallowed routes are rejected, and the session registry is testable.

---

## Phase 3: User Story 1 - Discover Products (Priority: P1) 🎯 MVP

**Goal**: Signed-out shoppers can browse, search, and directly reload product details with accurate loading, empty, unavailable, and success states.

**Independent Test**: Open `/products` signed out, search by partial name, verify `?q=`, open a product, reload `/products/:id`, and simulate empty and unavailable responses.

### Tests for User Story 1

- [X] T012 [P] [US1] Write schema tests covering positive IDs/prices, non-blank name/description, three-uppercase-letter currency, non-negative optional stock, boolean availability, and nullable optional image URL in frontend/src/features/products/api/product-schemas.test.ts
- [X] T013 [P] [US1] Write list, search query encoding, detail, malformed-payload, not-found, and unavailable client tests in frontend/src/features/products/api/product-client.test.ts
- [X] T014 [P] [US1] Write browse/search/detail tests for 300 ms debounce, stale-search suppression, `?q=` synchronization, direct reload, image fallback, and loading/empty/error states in frontend/src/features/products/components/product-journey.test.tsx

### Implementation for User Story 1

- [X] T015 [P] [US1] Consolidate the Product schema in frontend/src/features/products/api/product-schemas.ts with the exact constraints `id: positive integer`, `name/description: non-blank string`, `price: positive decimal`, `currency: three uppercase ISO 4217 letters`, `available: boolean`, `stockQuantity: non-negative integer and optional for browser responses`, and `imageUrl: URL or null`
- [X] T016 [US1] Implement Zod-validated `fetchProducts`, `searchProducts`, and `fetchProduct` calls to `/api/catalog/products*` with typed error mapping in frontend/src/features/products/api/product-client.ts
- [X] T017 [US1] Connect the product catalogue to the client and render current data, loading, empty, and unavailable states in frontend/src/features/products/components/product-list.tsx
- [X] T018 [US1] Implement debounced search with URL `?q=` state, request cancellation/stale-result suppression, clear-to-catalogue behavior, and special-character encoding in frontend/src/features/products/components/product-search.tsx
- [X] T019 [P] [US1] Render product name, description, price/currency, availability, image fallback, and detail navigation in frontend/src/features/products/components/product-card.tsx
- [X] T020 [US1] Fetch product data from the route parameter and handle invalid, missing, loading, unavailable, and signed-out add-to-cart states in frontend/src/features/products/components/product-detail.tsx
- [X] T021 [US1] Route `/products` and `/products/:id` to the canonical kebab-case catalogue components in frontend/src/routes.tsx

**Checkpoint**: User Story 1 passes independently without authentication or mutable customer state.

---

## Phase 4: User Story 2 - Sign In and Manage a Persistent Cart (Priority: P1)

**Goal**: A shopper signs in through an opaque HttpOnly session and manages a server-authoritative cart that survives reloads and safely rolls back failed optimistic changes.

**Independent Test**: Sign in, add a product, change quantity, remove it, add another product, reload `/cart`, verify persistence, force a mutation failure, and verify rollback and absence of a script-readable JWT.

### Tests for User Story 2

- [X] T022 [P] [US2] Write BFF login, `/api/auth/me`, logout, expired-session, secure-cookie, no-JWT-response, protected-route, and upstream-auth-header contract tests in frontend/server/__tests__/auth-contract.test.ts
- [X] T023 [P] [US2] Write login success/failure, initial session load, logout, expired-session, and protected-route redirect tests in frontend/src/features/auth/components/auth-context.test.tsx
- [X] T024 [P] [US2] Write create/get/add/update/remove client tests including validation, 401/403/404/409 mapping, response parsing, and no browser-supplied customer or price fields in frontend/src/features/cart/api/cart-client.test.ts
- [X] T025 [P] [US2] Write cart initialization, create-on-first-add, optimistic quantity/removal, rollback, authoritative reconciliation, logout reset, and reload tests in frontend/src/features/cart/components/cart-context.test.tsx
- [X] T026 [P] [US2] Write cart page interaction tests for line quantity, removal, server total display, empty state, disabled actions, and checkout navigation in frontend/src/features/cart/components/cart-page.test.tsx

### Implementation for User Story 2

- [X] T027 [US2] Implement login token exchange, cryptographically random opaque cookie creation, `/api/auth/me`, logout revocation, expiry enforcement, `HttpOnly`, `SameSite=Lax`, path `/`, and production `Secure` behavior in frontend/server/bff.ts
- [X] T028 [US2] Align login/logout/getSession response parsing and normalized failure behavior with the BFF contract in frontend/src/features/auth/api/auth-api.ts
- [X] T029 [US2] Complete AuthProvider session bootstrap, login/logout transitions, expired-session reset, and stable loading behavior in frontend/src/features/auth/components/auth-context.tsx
- [X] T030 [P] [US2] Complete the credential form with pending state, accessible validation, failure feedback, and post-login return navigation in frontend/src/features/auth/components/login-page.tsx
- [X] T031 [P] [US2] Define Cart and Cart Item response schemas in frontend/src/features/cart/api/cart-schemas.ts with the exact constraints `Cart.id: positive integer`, `Cart.status: OPEN or CHECKED_OUT`, `Cart.items: may be empty before checkout`, `CartItem.id/productId: positive integer`, `productName: non-blank string`, `price: non-negative decimal`, and `quantity: positive integer`
- [X] T032 [US2] Consolidate get/create/add/update/remove operations into a Zod-validated, cookie-session cart client that never submits customer identity, price, or total in frontend/src/features/cart/api/cart-client.ts
- [X] T033 [US2] Complete CartProvider create-on-first-add, add/update/remove methods, per-mutation pending state, deterministic optimistic changes, rollback, server reconciliation, session changes, and error exposure in frontend/src/features/cart/components/cart-context.tsx
- [X] T034 [US2] Wire authenticated add-to-cart, unavailable-product blocking, pending state, and success/error feedback to CartProvider in frontend/src/features/products/components/product-detail.tsx
- [X] T035 [US2] Connect canonical cart item and quantity controls to CartProvider while preventing duplicate pending mutations in frontend/src/features/cart/components/cart-item.tsx
- [X] T036 [US2] Render authoritative cart lines and total, empty state, mutation feedback, and checkout eligibility in frontend/src/features/cart/components/cart-page.tsx
- [X] T037 [US2] Enforce session-aware protection for `/cart`, `/checkout`, `/confirmation/:orderId`, and `/orders`, preserving the requested destination through login in frontend/src/routes.tsx

**Checkpoint**: User Story 2 passes independently against product-service, cart-service, and the standalone BFF.

---

## Phase 5: User Story 3 - Submit and Reload an Order (Priority: P1)

**Goal**: A shopper submits the real cart exactly once, receives status-specific recovery guidance, and can reload a persisted confirmation.

**Independent Test**: Submit a non-empty cart, reload its confirmation URL, retry with the same key after an ambiguous response, verify one order, and exercise validation/session/ownership/not-found/conflict/unavailable errors.

### Tests for User Story 3

- [X] T038 [P] [US3] Write checkout request/response and Order/Order Line schema tests for positive IDs, key length 1-64, non-empty lines, non-negative monetary values, positive quantities, timestamps, and `PENDING|COMPLETED|CANCELLED` in frontend/src/features/orders/api/order-schemas.test.ts
- [X] T039 [P] [US3] Write checkout client tests for real cart ID, same-key retry, malformed response, and 400/401/403/404/409/422/503 recovery mapping in frontend/src/features/orders/api/checkout-client.test.ts
- [X] T040 [P] [US3] Write key creation, cart-scoped sessionStorage reuse, definitive-failure replacement, success cleanup, and UUID length tests in frontend/src/shared/utils/checkout-attempt.test.ts
- [X] T041 [P] [US3] Write confirmation direct-load, reload, persisted line/total rendering, missing order, ownership denial, and unavailable-state tests in frontend/src/features/orders/components/confirmation-page.test.tsx
- [X] T042 [P] [US3] Write a browser test for checkout success, ambiguous-response retry with one resulting order, confirmation reload, empty-cart blocking, and expired-session recovery in frontend/e2e/checkout-confirmation.spec.ts

### Implementation for User Story 3

- [X] T043 [US3] Preserve checkout request bodies and upstream status codes, forward the authenticated bearer token, and mirror the body key as `Idempotency-Key` for `/api/customer/checkout` in frontend/server/bff.ts
- [X] T044 [P] [US3] Consolidate Order and Order Line schemas in frontend/src/features/orders/api/order-schemas.ts with the exact constraints `Order.id/cartId: positive integer`, `userId: non-blank string`, `status: PENDING, COMPLETED, or CANCELLED`, `orderDate: timestamp`, `total: non-negative decimal`, `orderLines: non-empty list`, and line `productId: positive integer`, `productName: non-blank string`, `unitPrice/lineTotal: non-negative decimal`, `quantity: positive integer`
- [X] T045 [P] [US3] Implement cart-scoped checkout attempt states `READY`, `SUBMITTING`, `AMBIGUOUS`, `SUCCEEDED`, and `FAILED`, generate an opaque key of at most 64 characters, and persist only that non-secret key in frontend/src/shared/utils/checkout-attempt.ts
- [X] T046 [US3] Implement validated checkout submission and distinct validation, expired-session, forbidden, missing-resource, conflict, and unavailable errors in frontend/src/features/orders/api/checkout-client.ts
- [X] T047 [US3] Connect checkout to the current non-empty cart, disable duplicate submission, reuse ambiguous-attempt keys, refresh conflicts, clear successful cart state, and navigate to the returned order in frontend/src/features/orders/components/checkout-page.tsx
- [X] T048 [P] [US3] Implement validated `fetchOrder` for `/api/customer/orders/:id` in frontend/src/features/orders/api/order-client.ts
- [X] T049 [US3] Load confirmation from the URL and render persisted identifier, date, status, lines, quantities, recorded prices, total, and access/error states in frontend/src/features/orders/components/confirmation-page.tsx

**Checkpoint**: User Story 3 proves exactly-once observable checkout behavior and durable confirmation independently of order history.

---

## Phase 6: User Story 4 - Review Previous Orders (Priority: P2)

**Goal**: An authenticated shopper can see all owned orders, open a persisted confirmation, and never read another shopper's order.

**Independent Test**: Sign in as a shopper with multiple orders, verify the history and empty state, open one order, then sign in as another shopper and verify that order data is not disclosed.

### Tests for User Story 4

- [X] T050 [P] [US4] Write order-list client tests for validated arrays, empty history, malformed responses, expired sessions, and unavailable service behavior in frontend/src/features/orders/api/order-client.test.ts
- [X] T051 [P] [US4] Write history component tests for newest-first rows, ID/date/status/total columns, empty/loading/error states, and confirmation navigation in frontend/src/features/orders/components/order-history.test.tsx
- [X] T052 [P] [US4] Write BFF order list/detail ownership and no-protected-data-disclosure contract tests in frontend/server/__tests__/orders-contract.test.ts
- [X] T053 [P] [US4] Write a browser test for populated history, empty history, detail navigation, and cross-customer denial in frontend/e2e/order-history.spec.ts

### Implementation for User Story 4

- [X] T054 [US4] Add validated `fetchOrders` using the same authoritative Order schema and authenticated `/api/customer/orders` route in frontend/src/features/orders/api/order-client.ts
- [X] T055 [US4] Implement newest-first order rows with identifier, date, status, server total, empty/loading/error states, and confirmation links in frontend/src/features/orders/components/order-history.tsx
- [X] T056 [US4] Replace the order-history placeholder with the canonical protected component in frontend/src/routes.tsx

**Checkpoint**: All four stories are independently functional and the complete persisted customer journey is available.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Remove obsolete runtime paths, prove the combined journey, and enforce repository-wide delivery gates.

- [X] T057 [P] Remove `next/*`, `server-only`, and `use server` dependencies from active Vite code and update remaining imports in frontend/src/features/
- [X] T058 Replace PascalCase duplicates with canonical kebab-case imports, then remove obsolete duplicate files and frontend/src/app/ after import verification in frontend/src/
- [X] T059 [P] Add the complete sign-in, browse/search/detail, add/update/remove, checkout, confirmation reload, history, logout, and protected-route smoke journey in frontend/e2e/customer-journey.spec.ts
- [X] T060 [P] Add security assertions that no JWT appears in response bodies or script-readable storage and that browser requests never target service ports directly in frontend/e2e/session-security.spec.ts
- [X] T061 Update format, lint, type-check, unit test, production build, mocked Playwright API journey, and artifact upload gates in .github/workflows/frontend-ci.yml
- [X] T062 [P] Update delivered routes, payloads, retry behavior, and customer recovery guidance in docs/frontend-order-api.md and docs/frontend-backlog.md
- [X] T063 Run every command and manual scenario in specs/001-customer-journey-integration/quickstart.md and record deviations or corrections in specs/001-customer-journey-integration/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002 and T003 can proceed while T001 updates package metadata.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories; tests T004-T005 precede implementations T006-T011.
- **US1 (Phase 3)**: Depends only on Foundational and delivers the public catalogue MVP.
- **US2 (Phase 4)**: Depends on Foundational; product-detail add-to-cart task T034 integrates with US1, while authentication and cart work can begin independently.
- **US3 (Phase 5)**: Depends on US2 for an authenticated non-empty cart; confirmation reads remain independently testable with seeded orders.
- **US4 (Phase 6)**: Depends on the authenticated session foundation from US2, but can use seeded orders without waiting for US3 implementation.
- **Polish (Phase 7)**: Cleanup waits for adopted canonical components; the combined journey and CI gate wait for all selected stories.

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 (public catalogue)
                    -> US2 (authentication + cart) -> US3 (checkout + confirmation)
                                               \----> US4 (order history)

US1 + US2 + US3 + US4 -> Polish and full journey gate
```

### Within Each User Story

- Write the listed tests first and confirm failure for the missing behavior.
- Define/validate network schemas before clients consume them.
- Implement clients before contexts and pages.
- Complete route integration after the canonical component exists.
- Run the independent-test scenario at the phase checkpoint before advancing.

### Parallel Opportunities

- Setup configuration tasks T002-T003 operate on different files.
- Foundational proxy and session tests T004-T005 can run together; config T009 can proceed beside implementation work.
- US1 test tasks T012-T014 and component task T019 touch separate files.
- US2 test tasks T022-T026 can run together; UI tasks T030-T031 can proceed after their contracts are fixed.
- US3 test tasks T038-T042 can run together; schema/key/client-read tasks T044-T045 and T048 touch separate files.
- US4 test tasks T050-T053 can run together.
- Cleanup documentation, combined browser tests, and security tests T057, T059-T060, and T062 can proceed in parallel after story completion.

## Parallel Examples

### User Story 1

```text
Task T012: Product schema boundary tests
Task T013: Product client contract tests
Task T014: Browse/search/detail component tests
```

### User Story 2

```text
Task T022: BFF auth/session contract tests
Task T023: Auth context tests
Task T024: Cart client tests
Task T025: Cart context tests
Task T026: Cart page tests
```

### User Story 3

```text
Task T038: Order schema tests
Task T039: Checkout client tests
Task T040: Checkout-attempt state tests
Task T041: Confirmation page tests
Task T042: Checkout/confirmation browser test
```

### User Story 4

```text
Task T050: Order-list client tests
Task T051: Order-history component tests
Task T052: Order ownership contract tests
Task T053: Order-history browser test
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete User Story 1.
3. Stop and validate signed-out list, search, direct product detail, and all catalogue states.
4. Demo or deploy the public catalogue as the first independently valuable increment.

### Incremental Delivery

1. Add US2 to establish secure sessions and persistent cart management.
2. Add US3 to produce the core business outcome: retry-safe checkout and durable confirmation.
3. Add US4 to complete persistent order review.
4. Finish cleanup, combined browser/security tests, documentation, and CI gates.

### Parallel Team Strategy

After the Foundation checkpoint, one stream can complete US1 while a second starts the auth/cart tests for US2. Once US2 session behavior is stable, checkout/confirmation and order-history streams can proceed in parallel using seeded order fixtures. Merge canonical component cleanup only after all story imports have moved.

## Notes

- Existing files contain partial implementations; each task must preserve verified behavior and replace only mismatched or duplicate paths.
- `[P]` means file-level independence, not permission to bypass prerequisite tests or contracts.
- Tests precede implementation because automated coverage is an explicit feature requirement.
- Commit after each task or coherent test/implementation pair.
- Stop at each checkpoint and run that story's independent test before continuing.
