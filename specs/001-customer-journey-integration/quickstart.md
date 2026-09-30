# Quickstart: Validate the Authenticated Grocery Customer Journey

## Prerequisites

- Node.js version from `frontend/.nvmrc`
- npm
- Java 25 and the repository Maven wrapper
- Docker Compose for service dependencies and the integration environment
- Redis 7 (provided by the Compose stack) for durable BFF sessions
- A test user accepted by the demo identity provider

The browser contract is defined in [contracts/browser-bff.openapi.yaml](contracts/browser-bff.openapi.yaml). Domain state and ownership are described in [data-model.md](data-model.md).

## 1. Install and run static checks

```bash
cd frontend
npm ci
npm run format
npm run lint
npm run type-check
npm test
npm run build
```

Expected: every command exits successfully, all colocated `*.test.*` and `*.spec.*` files outside legacy backup paths are discovered, and the production bundle is created.

## 2. Start the services

From the repository root, start Redis plus product, cart, and order services using `microservices/docker-compose.yml`. Confirm their configured host ports match:

- cart-service: `8081`
- order-service: `8082`
- product-service: `8083`
- Redis: `6379`

Expected: each required service reports healthy before the browser application starts.

## 3. Start the BFF and browser client

```bash
cd frontend
export REDIS_URL=redis://localhost:6379
export JWT_ISSUER_URI=http://cart-service:8080
export JWT_JWKS_URI=http://localhost:8081/.well-known/jwks.json
npm run dev
```

Expected:

- BFF listens on `http://localhost:3000`.
- Vite listens on `http://localhost:5173`.
- Browser calls use relative `/api/*` paths and never call ports 8081-8083 directly.
- The BFF validates token signature, issuer, audience, algorithm, and expiry against the configured JWKS before creating a Redis-backed session.

## 4. Validate the public catalogue

1. Open `http://localhost:5173/products` while signed out.
2. Confirm products render with name, price, image fallback, and availability.
3. Search by a partial name and confirm the URL contains `?q=`.
4. Clear search and open a product detail page.
5. Reload the detail URL.

Expected: public data survives direct navigation; loading, empty, and failure states are distinct; add-to-cart is unavailable or redirects to sign-in while signed out.

## 5. Validate authentication and cart persistence

1. Open `/cart` and confirm redirection to `/login`.
2. Sign in with the configured demo user.
3. Add an available product from its detail page.
4. Change quantity, remove the line, and add a different product.
5. Reload `/cart`.
6. Inspect browser storage and confirm no JWT is readable by scripts.

Expected: cart changes reconcile with the service, survive reload, and show actionable feedback on a simulated failed mutation.

## 6. Validate checkout, retry, and confirmation

1. With a non-empty cart, open `/checkout`.
2. Submit once and record the resulting order ID.
3. Reload `/confirmation/{orderId}`.
4. Simulate an ambiguous first response and retry with the retained checkout key.
5. Verify the retry resolves to the same order and order count does not increase.

Expected: confirmation contains persisted lines and totals, the cart is no longer mutable after success, and one checkout attempt produces one order.

## 7. Validate history and ownership

1. Open `/orders` and confirm the new order is listed.
2. Open the order from the list.
3. Sign in as a different test user and request the first user's order URL and cart identifiers.

Expected: the owner can reload the order; the other user receives not-found or forbidden behavior without protected data.

## 8. Run the automated browser journey

With integration dependencies available:

```bash
cd frontend
npm run test:e2e
```

Expected: Playwright completes sign-in, browse/search, add/update/remove, checkout, confirmation reload, history, logout, and protected-route checks. Run the happy path three times when validating repeatability.

## Failure checks

- Stop one downstream service and verify the BFF returns a controlled unavailable response.
- Expire or remove the session and verify protected calls return 401 and the UI returns to sign-in.
- Change the cart between checkout attempts and verify conflict handling refreshes the cart.
- Request missing products/orders and verify no stale entity remains on screen.

## Validation record — 2026-09-30

- `npm run format`: passed.
- `npm run lint`: passed.
- `npm run type-check`: passed.
- `npm test`: passed with 44 files and 168 tests.
- `npm run build`: passed; Vite produced the production bundle.
- `npm run test:e2e`: runner and BFF/Vite startup passed; four real-service scenarios were discovered and intentionally skipped because `E2E_REAL_SERVICES` was not set.
- Real Docker-backed checkout, retry, cross-customer, and manual browser scenarios remain enforced in `.github/workflows/frontend-ci.yml`, where the microservice stack is started and `E2E_REAL_SERVICES=1` is set. They were not executed locally because this workspace did not have the required Playwright system library (`libnspr4`) or a running seeded microservice stack.
