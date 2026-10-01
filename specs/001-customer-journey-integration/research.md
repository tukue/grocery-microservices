# Research: Authenticated Grocery Customer Journey

## Decision 1: Keep Vite and React Router as the browser runtime

**Decision**: Use the repository's active Vite build and React Router route tree. Remove or quarantine remaining Next.js patterns once all imports are migrated.

**Rationale**: `frontend/package.json`, `frontend/src/main.tsx`, and `frontend/vite.config.ts` establish Vite as the executable application. React Router is already installed and the route shell exists. Maintaining two rendering models creates broken imports and duplicate components without adding user value.

**Alternatives considered**: Migrating to Next.js was rejected because it is not part of the active build; retaining both route models was rejected because it makes ownership, tests, and runtime behavior ambiguous.

## Decision 2: Replace the development-only BFF plugin with a standalone Express BFF

**Decision**: Run an Express process on port 3000 for auth/session handling and service routing. Run Vite on port 5173 in development and proxy `/api` to the BFF. The deployable BFF may serve the built SPA or sit behind the same ingress.

**Rationale**: The existing `vite-bff-plugin.ts` only exists inside the development server and currently places the JWT itself in a cookie. A standalone process makes the security boundary available in development, tests, and deployment and matches the architecture described by the source specification.

**Alternatives considered**: Keeping the Vite plugin was rejected because it is not a production runtime. Direct browser-to-service calls were rejected because they expose topology and bearer tokens. Next.js server routes were rejected because they conflict with the chosen runtime.

## Decision 3: Use an opaque HttpOnly session cookie backed by a server-side registry

**Decision**: On login, generate a cryptographically random session ID, store `{jwt, userId, email, expiresAt}` in a BFF-owned registry, and set only the ID in a `HttpOnly`, `SameSite=Lax`, path `/` cookie. Use `Secure` outside local development. Remove the record on logout and reject expired records.

**Rationale**: This implements the requirement that tokens never reach browser scripts and permits server-side revocation.

**Alternatives considered**: Browser token storage was rejected as script-readable. A JWT directly in an HttpOnly cookie was rejected because the chosen architecture requires session-ID-to-token mapping. A distributed session store is deferred for the single demo runtime, but the store boundary must remain replaceable before horizontal scaling.

## Decision 4: Preserve existing service contracts behind a browser-specific API

**Decision**: Expose `/api/catalog/*`, `/api/customer/*`, and `/api/auth/*` from the BFF. Strip `/catalog` only for product-service, preserve `/api/customer` for cart/order services, use an explicit route allowlist, and attach the bearer token server-side for protected routes.

**Rationale**: Existing controllers already implement the required operations. A narrow browser contract avoids backend rewrites and hides service hosts.

**Alternatives considered**: Renaming backend routes was rejected as a breaking change. A generic catch-all proxy was rejected because it could expose unintended upstream operations.

## Decision 5: Validate service responses and keep monetary authority on the server

**Decision**: Use Zod schemas at client boundaries for products, carts, and orders. Display totals from authoritative responses or derive them only for provisional presentation; never submit browser prices or totals.

**Rationale**: Existing validation is incomplete and adapters are duplicated. Consolidation prevents malformed upstream data from silently entering application state.

**Alternatives considered**: TypeScript-only network types were rejected because they do not validate runtime data. Client-submitted totals were rejected because they may be stale or manipulated.

## Decision 6: Make checkout retries explicit and durable for the browser session

**Decision**: Generate a UUID when checkout begins, keep it in `sessionStorage` under the cart ID until success or a material cart change, and submit it in the accepted request body. The BFF may mirror it as `Idempotency-Key`. Reuse it after timeout or temporary failure.

**Rationale**: `crypto.randomUUID()` stays within the 64-character service limit. Retention across a same-tab reload handles ambiguous outcomes using existing service idempotency.

**Alternatives considered**: A new key per click was rejected because retries could duplicate orders. User-entered keys were rejected as an internal concern. Permanent storage was rejected because the key belongs to one attempt.

## Decision 7: Reconcile optimistic cart state after every mutation

**Decision**: Apply deterministic quantity/removal changes immediately, disable the affected action while pending, roll back on failure, and replace local state with the returned or refetched cart. First-add creates a cart if none exists.

**Rationale**: This preserves responsive interaction while recognizing server ownership of stock, prices, and authorization.

**Alternatives considered**: Fully pessimistic updates were rejected as unnecessarily slow. Trusting optimistic state after success was rejected because authoritative values may change.

## Decision 8: Test the real service-backed journey and retain focused unit tests

**Decision**: Use Vitest/Testing Library for schemas, clients, contexts, and routes; Maven suites for service rules; server contract tests for the BFF boundary; and Playwright with mocked browser-facing APIs for the customer journey. CI starts only Vite for Playwright, keeping the browser suite independent of service readiness and host ports.

**Rationale**: Mock-only tests cannot prove cookie behavior, routing, persistence, ownership, or confirmation reload across process boundaries.

**Alternatives considered**: Starting the complete Docker stack for every browser test was rejected after it made the frontend gate depend on local service startup and seed data. Exercising every error solely through Playwright remains too slow and brittle; detailed error mapping belongs in focused tests.
