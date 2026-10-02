# Grocery Microservices: Frontend/Backend Integration Specification

Reviewed: 21 September 2026
Baseline: PR #59, "Feature/frontend cart", merged into main.
Commit: `8dd66f6583a837af67571d1f0d92047b66dcc5ca`
PR: https://github.com/tukue/grocery-microservices/pull/59

---

## Goal

Deliver a real authenticated customer journey:

> Browse products -> Add items -> Edit cart -> Submit order -> Reload persisted confirmation -> View order history.

---

## Architecture Decision

**Runtime:** Vite + React Router (SPA) with a lightweight Express/Node BFF for session handling and service routing.

**Why not Next.js:** The `package.json` lacks `next` as a dependency. The `src/app/` directory contains Next.js patterns but the build system is Vite. Commit to Vite + React Router; remove Next.js artifacts in a later cleanup task.

**Session model:** HttpOnly cookie holding a session ID. BFF maps session to JWT. Tokens never reach the browser.

---

## API Contract

| Operation | Browser Route | BFF proxies to | Service |
|-----------|--------------|----------------|---------|
| Catalogue | `GET /api/catalog/products` | `GET /products` | product-service |
| Search | `GET /api/catalog/products/search?name=` | `GET /products/search?name=` | product-service |
| Product detail | `GET /api/catalog/products/:id` | `GET /products/:id` | product-service |
| Current cart | `GET /api/customer/cart` | Same | cart-service |
| Create cart | `POST /api/customer/cart` | Same | cart-service |
| Add line | `POST /api/customer/cart/:cartId/items` | Same | cart-service |
| Update qty | `PATCH /api/customer/cart/:cartId/items/:itemId` | Same | cart-service |
| Remove line | `DELETE /api/customer/cart/:cartId/items/:itemId` | Same | cart-service |
| Checkout | `POST /api/customer/checkout` | Same | order-service |
| Order list | `GET /api/customer/orders` | Same | order-service |
| Order detail | `GET /api/customer/orders/:id` | Same | order-service |
| Sign in | `POST /api/auth/login` | `POST /auth/login` | cart-service (demo) |
| Sign out | `POST /api/auth/logout` | Clears cookie | BFF |
| Session | `GET /api/auth/me` | Validates cookie, returns user | BFF |

### Payload Rules

- Add: `{productId, quantity}`
- Update: `{quantity}`
- Checkout: `{cartId, idempotencyKey}` (key max 64 chars, generated internally)
- Never send client-computed prices or customer IDs

### Port Map (Docker Compose)

| Service | Host port | Container port |
|---------|-----------|---------------|
| product-service | 8083 | 8080 |
| cart-service | 8081 | 8080 |
| order-service | 8082 | 8080 |
| ledger-service | 8084 | 8080 |
| BFF (new) | 3000 | 3000 |

---

## Implementation Tasks

Each task is one commit. Run `npm test`, `npm run type-check`, and `npm run build` after each.

---

### Phase 1: Runtime and Routing

#### INT-01: Add React Router to Vite entry point

**Goal:** Replace the starter `App.tsx` with a routed shell.

**Read:**
- `frontend/src/App.tsx` (current starter)
- `frontend/src/main.tsx` (entry)
- `frontend/package.json` (check react-router-dom)

**Do:**
1. Install `react-router-dom` if missing.
2. Create `frontend/src/routes.tsx` with a `createBrowserRouter`:
   - `/` redirects to `/products`
   - `/products` renders `<ProductList />`
   - `/products/:id` renders `<ProductDetail />`
   - `/cart` renders `<CartPage />`
   - `/checkout` renders `<CheckoutPage />`
   - `/confirmation/:orderId` renders `<ConfirmationPage />`
   - `/orders` renders `<OrderHistory />`
   - `*` renders a 404 page
3. Create placeholder components for each route (just headings).
4. Update `App.tsx` to render `<RouterProvider>`.

**Verify:** `npm run dev` shows a routed shell. Navigate all routes. `npm run type-check` passes.

**Commit:** `feat(routing): add React Router with route shell`

---

#### INT-02: Remove Next.js artifacts from Vite build

**Goal:** Eliminate `next/*` and `server-only` imports that break the Vite build.

**Read:**
- `frontend/tsconfig.app.json` (include list)
- `frontend/src/app/` directory
- `frontend/src/features/products/components/product-card.tsx` (uses `next/image`)
- `frontend/src/features/products/components/product-search.tsx` (uses `next/navigation`)
- `frontend/src/features/cart/api/add-to-cart.action.ts` (uses `"use server"`)

**Do:**
1. Move `src/app/` directory content to `src/app-backup/` (do not delete yet).
2. Replace `next/image` imports with plain `<img>` in `product-card.tsx`.
3. Replace `next/navigation` imports with `react-router-dom` in `product-search.tsx`.
4. Remove `"use server"` directive from `add-to-cart.action.ts` (convert to client function).
5. Remove `import "server-only"` statements.
6. Update `tsconfig.app.json` include list to cover all `src/` files.

**Verify:** `npm run type-check` passes. `npm run build` succeeds. No `next/*` imports remain in `src/`.

**Commit:** `chore(cleanup): remove Next.js artifacts from Vite build`

---

#### INT-03: Create Express BFF with session cookie

**Goal:** Add a BFF server that handles auth and proxies to microservices.

**Read:**
- `frontend/vite.config.ts` (current proxy)
- `frontend/package.json` (scripts)
- `microservices/cart-service/` (demo identity provider at `POST /auth/login`)

**Do:**
1. Install `express`, `cookie-parser`, `http-proxy-middleware` as devDependencies.
2. Create `frontend/server/bff.ts`:
   - `POST /api/auth/login` proxies to cart-service `/auth/login`, sets HttpOnly cookie with session JWT.
   - `POST /api/auth/logout` clears cookie.
   - `GET /api/auth/me` resolves the opaque cookie through the Redis-backed server session and returns `{userId, email}`; browser cookies never contain JWTs.
   - All `/api/customer/*` requests forward `Authorization: Bearer <cookie-jwt>` to the correct service.
   - `/api/catalog/*` proxies to product-service (public, no auth).
3. Create `frontend/server/proxy.ts` with route-to-service mapping.
4. Add `"dev:server": "tsx server/bff.ts"` and `"dev:client": "vite"` scripts.
5. Add `"dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""` script.
6. Install `tsx` and `concurrently`.

**Verify:** `npm run dev:server` starts on port 3000. `curl http://localhost:3000/api/catalog/products` returns product list.

**Commit:** `feat(bff): add Express BFF with session cookie and service proxy`

---

#### INT-04: Update Vite proxy to route through BFF

**Goal:** All frontend API calls go to the BFF on port 3000.

**Read:**
- `frontend/vite.config.ts`
- `frontend/server/bff.ts`

**Do:**
1. Update `vite.config.ts` proxy to forward `/api` to `http://localhost:3000`.
2. Remove direct service proxy entries (`/products` -> 8083, `/api` -> 8081).
3. Add `server: { port: 5173 }` to vite config for dev client.

**Verify:** `npm run dev` (both server and client). Browser requests to `/api/catalog/products` reach product-service through BFF.

**Commit:** `feat(proxy): route all API calls through BFF`

---

### Phase 2: Authentication

#### INT-05: Create auth context and provider

**Goal:** React context that holds session state.

**Read:**
- `frontend/src/shared/errors/application-error.ts`
- `frontend/src/features/orders/components/checkout-form.tsx` (pattern for context)

**Do:**
1. Create `frontend/src/features/auth/domain/session.ts`:
   ```ts
   type Session = { userId: string; email: string } | null;
   ```
2. Create `frontend/src/features/auth/api/auth-api.ts`:
   - `login(email, password): Promise<Session>` -> `POST /api/auth/login`
   - `logout(): Promise<void>` -> `POST /api/auth/logout`
   - `getSession(): Promise<Session>` -> `GET /api/auth/me`
3. Create `frontend/src/features/auth/components/auth-context.tsx`:
   - `AuthProvider` wraps app, calls `getSession()` on mount.
   - `useSession()` hook returns `{session, login, logout, loading}`.
4. Wrap `<App>` with `<AuthProvider>` in `main.tsx`.

**Verify:** `npm run type-check` passes. Auth context renders without errors.

**Commit:** `feat(auth): add session context and provider`

---

#### INT-06: Create sign-in page

**Goal:** Login form that calls BFF and stores session.

**Read:**
- `frontend/src/features/auth/components/auth-context.tsx`
- `frontend/src/features/auth/api/auth-api.ts`
- Backend `POST /auth/login` request/response shape

**Do:**
1. Create `frontend/src/features/auth/components/login-page.tsx`:
   - Email + password form.
   - Calls `login()` from auth context.
   - On success, navigates to `/products`.
   - On failure, shows error message.
2. Add `/login` route to `routes.tsx`.
3. Protect `/cart`, `/checkout`, `/orders` routes (redirect to `/login` if no session).

**Verify:** `npm run dev`. Navigate to `/cart` -> redirects to `/login`. Log in -> redirects to `/products`. `npm test` passes.

**Commit:** `feat(auth): add sign-in page with route protection`

---

### Phase 3: Product Catalogue

#### INT-07: Connect product list to real API

**Goal:** Fetch and display products from product-service.

**Read:**
- `frontend/src/features/products/api/product-adapter.ts` (existing adapter)
- `frontend/src/features/products/api/products-api.ts` (server adapter)
- `frontend/src/features/products/components/ProductCard.tsx`
- Backend `GET /products` response shape

**Do:**
1. Create `frontend/src/features/products/api/product-client.ts`:
   - `fetchProducts(): Promise<Product[]>` -> `GET /api/catalog/products`
   - `searchProducts(name: string): Promise<Product[]>` -> `GET /api/catalog/products/search?name=`
2. Create Zod schema in `frontend/src/features/products/api/product-schemas.ts` for the response.
3. Create `frontend/src/features/products/components/product-list.tsx`:
   - Calls `fetchProducts()` on mount.
   - Renders loading, error, empty states.
   - Maps each product to `<ProductCard>`.
4. Replace placeholder in `routes.tsx` with `<ProductList />`.

**Verify:** `npm run dev`. Product list renders real data. Loading/error states work. `npm test` passes.

**Commit:** `feat(products): connect product list to real API`

---

#### INT-08: Connect product search

**Goal:** Search bar that queries product-service.

**Read:**
- `frontend/src/features/products/api/product-client.ts`
- Backend `GET /products/search?name=` response

**Do:**
1. Create `frontend/src/features/products/components/search-bar.tsx`:
   - Input with debounce (300ms).
   - Calls `searchProducts(value)`.
   - Displays results below input.
   - Shows loading, empty, error states.
2. Add `<SearchBar />` above `<ProductList />` in the product list page.
3. URL state: update `?q=` query param on search.

**Verify:** Type in search bar -> results update after debounce. URL reflects search. Clear search -> shows all products.

**Commit:** `feat(products): add search bar with debounce`

---

#### INT-09: Create product detail page

**Goal:** Individual product page with add-to-cart.

**Read:**
- `frontend/src/features/products/api/product-client.ts`
- `frontend/src/features/products/components/ProductCard.tsx`
- Backend `GET /products/:id` response

**Do:**
1. Add `fetchProduct(id: number)` to `product-client.ts`.
2. Create `frontend/src/features/products/components/product-detail.tsx`:
   - Fetches product by ID from URL param.
   - Shows image, name, price, availability.
   - "Add to Cart" button (disabled if unavailable or not logged in).
3. Replace placeholder in `routes.tsx`.

**Verify:** Click product card -> navigates to detail page. Direct URL works. "Add to Cart" disabled when not logged in.

**Commit:** `feat(products): add product detail page`

---

### Phase 4: Cart

#### INT-10: Create cart API client

**Goal:** Client-side functions for all cart operations.

**Read:**
- `frontend/src/features/cart/api/cart-adapter.ts` (existing)
- `frontend/src/features/cart/api/cart-api.ts` (server adapter)
- Backend cart endpoints and response shapes

**Do:**
1. Create `frontend/src/features/cart/api/cart-client.ts`:
   - `getCart(): Promise<Cart>` -> `GET /api/customer/cart`
   - `createCart(): Promise<Cart>` -> `POST /api/customer/cart`
   - `addItem(cartId, productId, quantity): Promise<Cart>` -> `POST /api/customer/cart/:cartId/items`
   - `updateItem(cartId, itemId, quantity): Promise<Cart>` -> `PATCH /api/customer/cart/:cartId/items/:itemId`
   - `removeItem(cartId, itemId): Promise<Cart>` -> `DELETE /api/customer/cart/:cartId/items/:itemId`
2. Create Zod schemas in `frontend/src/features/cart/api/cart-schemas.ts`.

**Verify:** `npm run type-check` passes. Unit tests for each function.

**Commit:** `feat(cart): add cart API client with Zod schemas`

---

#### INT-11: Create cart context with optimistic updates

**Goal:** Shared cart state consumed by header, cart page, and checkout.

**Read:**
- `frontend/src/features/cart/api/cart-client.ts`
- `frontend/src/features/auth/components/auth-context.tsx` (pattern)

**Do:**
1. Create `frontend/src/features/cart/components/cart-context.tsx`:
   - `CartProvider` fetches cart on mount (if logged in).
   - `useCart()` hook returns `{cart, addItem, updateItem, removeItem, loading, error}`.
   - Optimistic updates: apply locally, revert on server error.
   - Refetch cart after each mutation for server-authoritative state.
2. Wrap `<App>` with `<CartProvider>` inside `<AuthProvider>`.

**Verify:** Log in -> cart loads. Add item -> cart updates immediately. Refresh page -> cart persists.

**Commit:** `feat(cart): add cart context with optimistic updates`

---

#### INT-12: Connect product detail "Add to Cart"

**Goal:** Product detail page adds items to real cart.

**Read:**
- `frontend/src/features/products/components/product-detail.tsx`
- `frontend/src/features/cart/components/cart-context.tsx`

**Do:**
1. Import `useCart()` in `product-detail.tsx`.
2. Wire "Add to Cart" button to call `addItem(cart.id, product.id, 1)`.
3. Show success toast or navigate to `/cart`.
4. Disable button while adding. Re-enable on error.

**Verify:** Click "Add to Cart" -> cart count updates in header. Button disables during request. Error shows feedback.

**Commit:** `feat(cart): connect product detail add-to-cart`

---

#### INT-13: Create cart page with quantity editing

**Goal:** Full cart page with line item management.

**Read:**
- `frontend/src/features/cart/components/CartPage.tsx` (existing)
- `frontend/src/features/cart/components/CartItem.tsx` (existing)
- `frontend/src/features/cart/components/QuantityControl.tsx` (existing)
- `frontend/src/features/cart/components/cart-context.tsx`

**Do:**
1. Rewrite `CartPage.tsx` to use `useCart()` context.
2. Wire `CartItem` remove button to `removeItem()`.
3. Wire `QuantityControl` +/- buttons to `updateItem()`.
4. Show empty cart state when no items.
5. Show cart total (derived from item prices).
6. "Proceed to Checkout" button (disabled if cart empty or not logged in).

**Verify:** Change quantity -> persists. Remove item -> cart updates. Empty cart -> checkout disabled. Refresh -> state persists.

**Commit:** `feat(cart): connect cart page with quantity editing`

---

### Phase 5: Checkout

#### INT-14: Generate idempotency keys internally

**Goal:** Replace the visible idempotency key input with internal generation.

**Read:**
- `frontend/src/features/orders/components/checkout-form.tsx`
- `frontend/src/features/orders/api/checkout-form-schema.ts`

**Do:**
1. Create `frontend/src/shared/utils/idempotency.ts`:
   - `generateIdempotencyKey(): string` -> crypto.randomUUID().
2. Update `checkout-form.tsx` to remove the idempotency key input.
3. Generate key in `onSubmit` handler.
4. Store key in `sessionStorage` for retry scenarios.

**Verify:** Checkout form no longer shows idempotency input. Key is generated and sent in request body.

**Commit:** `feat(checkout): generate idempotency keys internally`

---

#### INT-15: Connect checkout to real cart

**Goal:** Submit the actual cart through the canonical adapter.

**Read:**
- `frontend/src/features/orders/api/client-order-submission.ts`
- `frontend/src/features/orders/components/checkout-form.tsx`
- `frontend/src/features/cart/components/cart-context.tsx`

**Do:**
1. Update `checkout-form.tsx` to receive cart from `useCart()` context.
2. Remove hardcoded `cartId: 42`.
3. Pass real `cart.id` to `submitOrder()`.
4. On success, clear cart and navigate to `/confirmation/:orderId`.
5. On error, show distinct messages for 400/401/403/404/409/503.

**Verify:** Submit real cart -> order created. Cart clears. Navigate to confirmation. Error states display correctly.

**Commit:** `feat(checkout): connect checkout to real cart`

---

#### INT-16: Add checkout error handling

**Goal:** Handle all error codes distinctly.

**Read:**
- `frontend/src/features/orders/components/checkout-form.tsx`
- `frontend/src/shared/errors/application-error.ts`

**Do:**
1. Create `frontend/src/shared/errors/checkout-errors.ts`:
   - Map HTTP status to user-friendly messages.
   - 400/422: "Please check your cart items."
   - 401: "Session expired. Please sign in again."
   - 403: "You don't have permission for this cart."
   - 404: "Cart not found."
   - 409: "Cart was modified. Please review and try again."
   - 503: "Service temporarily unavailable. Please try again."
2. Update `checkout-form.tsx` to use these messages.

**Verify:** Each error code shows correct message. 409 refreshes cart. 401 redirects to login.

**Commit:** `feat(checkout): add distinct error handling for all status codes`

---

### Phase 6: Confirmation

#### INT-17: Create order read adapter

**Goal:** Fetch order details for confirmation page.

**Read:**
- `frontend/src/features/orders/api/order.schemas.ts`
- Backend `GET /api/customer/orders/:id` response

**Do:**
1. Create `frontend/src/features/orders/api/order-client.ts`:
   - `fetchOrder(id: number): Promise<Order>` -> `GET /api/customer/orders/:id`
   - `fetchOrders(): Promise<Order[]>` -> `GET /api/customer/orders`
2. Validate response with existing `orderResponseSchema`.

**Verify:** `npm run type-check` passes. Unit test with mock data.

**Commit:** `feat(orders): add order read adapter`

---

#### INT-18: Connect confirmation page to real order

**Goal:** Confirmation page fetches and displays the actual order.

**Read:**
- `frontend/src/features/orders/components/confirmation-page.tsx`
- `frontend/src/features/orders/api/order-client.ts`

**Do:**
1. Update `confirmation-page.tsx` to:
   - Extract `orderId` from URL params.
   - Call `fetchOrder(orderId)` on mount.
   - Show loading state.
   - Display order ID, date, status, line items, total.
   - Show error if order not found or not owned.
2. Remove `react-router-dom` `useParams` (use Vite's `react-router-dom` hook).

**Verify:** After checkout, confirmation shows real order data. Direct URL reload works. Unknown ID shows error.

**Commit:** `feat(confirmation): connect to real order data`

---

#### INT-19: Create order history page

**Goal:** List all orders for the signed-in customer.

**Read:**
- `frontend/src/features/orders/api/order-client.ts`
- Backend `GET /api/customer/orders` response

**Do:**
1. Create `frontend/src/features/orders/components/order-history.tsx`:
   - Calls `fetchOrders()` on mount.
   - Renders table with columns: ID, Date, Status, Total.
   - Click row -> navigates to `/confirmation/:id`.
   - Show empty state if no orders.
2. Add `/orders` route to `routes.tsx`.

**Verify:** After placing orders, history shows them. Click row -> confirmation page. Empty state works.

**Commit:** `feat(orders): add order history page`

---

### Phase 7: Quality Gates

#### INT-20: Fix vitest to discover all test files

**Goal:** All colocated tests are discovered.

**Read:**
- `frontend/vitest.config.mts`
- `frontend/tsconfig.app.json`

**Do:**
1. Update `vitest.config.mts` include to `src/**/*.{test,spec}.{ts,tsx}`.
2. Exclude `src/app-backup/` and `**/node_modules/**`.
3. Update `tsconfig.app.json` include to cover all `src/` files.

**Verify:** `npm test` discovers and runs all test files. No test files are skipped.

**Commit:** `test(config): update vitest to discover all colocated tests`

---

#### INT-21: Add integration tests for API clients

**Goal:** Unit tests for cart, product, and order API clients.

**Read:**
- `frontend/src/features/cart/api/cart-client.ts`
- `frontend/src/features/products/api/product-client.ts`
- `frontend/src/features/orders/api/order-client.ts`

**Do:**
1. Create `frontend/src/features/cart/api/__tests__/cart-client.test.ts`:
   - Mock fetch for each function.
   - Test success and error paths.
2. Create `frontend/src/features/products/api/__tests__/product-client.test.ts`.
3. Create `frontend/src/features/orders/api/__tests__/order-client.test.ts`.

**Verify:** `npm test` passes all new tests.

**Commit:** `test(api): add unit tests for API clients`

---

#### INT-22: Add integration tests for auth and cart contexts

**Goal:** Test auth and cart context behavior.

**Read:**
- `frontend/src/features/auth/components/auth-context.tsx`
- `frontend/src/features/cart/components/cart-context.tsx`

**Do:**
1. Create `frontend/src/features/auth/components/__tests__/auth-context.test.tsx`:
   - Test login/logout/session flow.
   - Test route protection.
2. Create `frontend/src/features/cart/components/__tests__/cart-context.test.tsx`:
   - Test optimistic updates.
   - Test error rollback.
   - Test empty cart state.

**Verify:** `npm test` passes all new tests.

**Commit:** `test(contexts): add tests for auth and cart contexts`

---

#### INT-23: Add e2e smoke test with Playwright

**Goal:** End-to-end test for the happy path.

**Read:**
- `frontend/playwright.config.ts`
- `frontend/e2e/checkout.spec.ts`

**Do:**
1. Install `@playwright/test` if missing.
2. Update `playwright.config.ts` to use port 3000.
3. Create `frontend/e2e/smoke.spec.ts`:
   - Sign in.
   - Browse products.
   - Add item to cart.
   - Update quantity.
   - Remove item.
   - Add different item.
   - Checkout.
   - Verify confirmation page shows order details.
   - Reload confirmation page.
4. Add `"test:e2e": "playwright test"` script.

**Verify:** `npm run test:e2e` passes.

**Commit:** `test(e2e): add Playwright smoke test for happy path`

---

### Phase 8: Cleanup

#### INT-24: Remove duplicate Vite-era components

**Goal:** Remove PascalCase duplicates now that kebab-case components are connected.

**Read:**
- `frontend/src/features/cart/components/AddToCartButton.tsx` (duplicate)
- `frontend/src/features/cart/components/add-to-cart-button.tsx` (canonical)
- `frontend/src/features/products/components/ProductCard.tsx` (duplicate)
- `frontend/src/features/products/components/product-card.tsx` (canonical)

**Do:**
1. Check imports of each PascalCase file.
2. Update any remaining imports to use kebab-case versions.
3. Delete PascalCase duplicates: `AddToCartButton.tsx`, `ProductCard.tsx`.
4. Remove `src/app-backup/` directory.

**Verify:** `npm run type-check` passes. `npm test` passes. No broken imports.

**Commit:** `chore(cleanup): remove duplicate Vite-era components`

---

#### INT-25: Remove Vite starter App.tsx content

**Goal:** App.tsx renders only the router, not the starter screen.

**Read:**
- `frontend/src/App.tsx`
- `frontend/src/App.css`

**Do:**
1. Update `App.tsx` to render only `<RouterProvider>` (already done in INT-01, verify).
2. Delete `App.css` if unused.
3. Clean up any unused starter assets.

**Verify:** `npm run dev` shows the app, not the starter. `npm run build` succeeds.

**Commit:** `chore(cleanup): remove Vite starter content`

---

#### INT-26: Update CI workflow for full stack

**Goal:** CI runs format, lint, type-check, unit tests, build, and e2e.

**Read:**
- `.github/workflows/frontend-ci.yml`
- `frontend/package.json` scripts

**Do:**
1. Update CI workflow to:
   - Install dependencies.
   - Run `npm run format`.
   - Run `npm run lint`.
   - Run `npm run type-check`.
   - Run `npm test`.
   - Run `npm run build`.
   - Start BFF + Vite dev server.
   - Run `npm run test:e2e`.
   - Tear down.
2. Add service startup to CI (docker-compose or direct).

**Verify:** Push to branch -> CI runs all checks. PR merges only when green.

**Commit:** `ci(frontend): update CI for full stack verification`

---

## Dependency Graph

```
INT-01 (router)
  └─> INT-02 (remove Next.js)
       └─> INT-03 (BFF)
            └─> INT-04 (proxy)
                 └─> INT-05 (auth context)
                      ├─> INT-06 (login page)
                      └─> INT-07 (product list)
                           ├─> INT-08 (search)
                           └─> INT-09 (product detail)
                                └─> INT-10 (cart API)
                                     └─> INT-11 (cart context)
                                          ├─> INT-12 (add to cart)
                                          └─> INT-13 (cart page)
                                               └─> INT-14 (idempotency)
                                                    └─> INT-15 (checkout connect)
                                                         └─> INT-16 (error handling)
                                                              └─> INT-17 (order read)
                                                                   ├─> INT-18 (confirmation)
                                                                   └─> INT-19 (order history)

INT-20 (vitest config) ─── independent
INT-21 (API tests) ─── after INT-10
INT-22 (context tests) ─── after INT-11
INT-23 (e2e) ─── after INT-18
INT-24 (cleanup) ─── after INT-13
INT-25 (starter cleanup) ─── after INT-01
INT-26 (CI) ─── after INT-23
```

---

## Completion Criteria

A milestone is complete when:

1. `npm run dev` starts the full stack (BFF + Vite).
2. A user can sign in, browse products, manage cart, checkout, and reload confirmation.
3. Failures preserve accurate customer state.
4. `npm test` and `npm run test:e2e` pass.
5. `npm run build` succeeds.
6. CI verifies the same.

Update `docs/frontend-backlog.md` and `docs/frontend-order-api.md` after each phase.

---

## Sources

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
