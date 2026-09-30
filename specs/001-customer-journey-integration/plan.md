# Implementation Plan: Authenticated Grocery Customer Journey

**Branch**: `feature/checkout-phase5` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-customer-journey-integration/spec.md`

## Summary

Complete the partially built Vite storefront as a real authenticated customer journey: public catalogue discovery, server-managed sign-in, a persistent customer-owned cart, retry-safe checkout, reloadable confirmation, and order history. Retain the existing React feature modules and Spring services where their contracts already align, replace the development-only Vite BFF plugin with a standalone Express BFF that owns opaque sessions and service routing, validate all service responses at the frontend boundary, and close the journey with unit, integration, browser, and CI gates.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js 24 for the storefront/BFF; Java 25 for existing Spring Boot services

**Primary Dependencies**: React 19, React Router 7, Vite 6, Express, cookie-parser, http-proxy-middleware, Zod 4, Spring Boot 4.1

**Storage**: Existing service-owned relational persistence for products, carts, and orders; Redis-backed BFF session registry with expiry; browser `sessionStorage` only for a non-secret checkout retry key

**Testing**: Vitest 3, Testing Library, Playwright, Maven/Spring test suites

**Target Platform**: Modern desktop/mobile browsers; Linux-hosted Node BFF and containerized Java services

**Project Type**: Web application plus BFF integrating existing microservices

**Performance Goals**: Visible catalogue and cart feedback within 2 seconds for at least 95% of interactions in the project test environment; 300 ms debounced search; immediate optimistic cart feedback followed by server reconciliation

**Constraints**: JWTs never exposed to browser scripts; identity and prices are server-authoritative; checkout key is opaque and at most 64 characters; direct URL reload must work; no payment, delivery, tax, or discount scope; existing service APIs remain backward compatible

**Scale/Scope**: One storefront, one BFF, three participating services, 9 browser routes, 14 browser-facing API operations, and one complete customer journey covered end to end

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository constitution is an unfilled template and defines no enforceable project-specific gates. Planning therefore applies the constraints present in the feature specification and repository:

- **Security boundary**: PASS — the BFF owns the service token; the browser receives only an opaque HttpOnly session cookie.
- **Server authority**: PASS — customer identity, price, availability, totals, cart ownership, and order ownership remain service-derived.
- **Testability**: PASS — browser contracts, schemas, unit/integration coverage, and an end-to-end journey are explicit outputs.
- **Compatibility**: PASS — existing service routes remain unchanged; the BFF adapts browser routes to them.
- **Simplicity**: PASS — reuse existing services and feature modules; add only the missing runtime boundary and journey integrations.

**Post-design re-check**: PASS. The design artifacts preserve the same boundaries. No constitutional violation or complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-customer-journey-integration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── browser-bff.openapi.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
frontend/
├── server/
│   ├── bff.ts                    # standalone BFF entry point and session lifecycle
│   ├── proxy.ts                  # browser route to service route mapping
│   └── session-store.ts          # opaque session ID to JWT mapping
├── src/
│   ├── features/
│   │   ├── auth/                 # login, logout, current session, route protection
│   │   ├── products/             # catalogue, search, detail and response schemas
│   │   ├── cart/                 # cart client, shared state and mutation UI
│   │   └── orders/               # checkout, confirmation and history
│   ├── shared/                   # errors, HTTP helpers and idempotency utility
│   ├── routes.tsx
│   └── main.tsx
├── e2e/
│   └── customer-journey.spec.ts
├── package.json
├── playwright.config.ts
├── vite.config.ts
└── vitest.config.mts

microservices/
├── product-service/              # authoritative catalogue and availability
├── cart-service/                 # authentication demo and customer cart
├── order-service/                # retry-safe checkout and customer orders
└── docker-compose.yml

.github/workflows/
└── frontend-ci.yml
```

**Structure Decision**: Keep the existing repository's web-application layout. The browser application and BFF stay under `frontend/`; authoritative domain behavior remains in the three existing service modules. Existing feature code is reconciled in place instead of creating parallel components or a fourth domain service.

## Implementation Strategy

1. **Stabilize runtime boundaries**: keep React Router as the SPA router, remove remaining Next.js/server-only artifacts, add the standalone BFF entry point, and make Vite proxy `/api` to that BFF during development.
2. **Secure the session path**: exchange credentials with the identity endpoint, verify each returned JWT's RS256 signature, issuer, audience, and expiry against trusted JWKS, store it only in the Redis-backed BFF session registry, set an opaque HttpOnly cookie, validate expiry on `/api/auth/me`, clear server and cookie state on logout, and inject the bearer token only for protected upstream calls.
3. **Finish catalogue integration**: consolidate duplicate product components, use one Zod-validated client for list/search/detail, synchronize search with `?q=`, and implement loading, empty, unavailable, and error states.
4. **Finish cart integration**: consolidate the current cart adapters, create a cart on first add when absent, expose add/update/remove through one context, use optimistic updates only where rollback is deterministic, and refresh from the service after each mutation.
5. **Complete checkout and reads**: generate and retain a per-attempt idempotency key, submit the real cart, map status-specific recovery behavior, clear/refresh cart state after success, fetch confirmation by URL, and add the real order-history page.
6. **Remove obsolete paths**: update imports to canonical kebab-case components, delete duplicate PascalCase and Next.js-era artifacts only after consumers migrate, and keep Vite as the sole browser build.
7. **Enforce quality gates**: broaden Vitest discovery, add API/context/route tests, add the full Playwright journey including reload and retry, and make CI run format, lint, type-check, unit tests, build, service-backed e2e, and teardown.

## Delivery Boundaries

- No changes to payment, registration, fulfillment, tax, discount, or admin features.
- No browser storage of JWTs, credentials, customer IDs as authority, prices as authority, or complete cart/order records.
- No direct browser calls to product, cart, or order service host ports.
- No removal of legacy components until import searches and tests show that the canonical replacements are active.
- Backend changes are limited to contract corrections proven necessary by integration tests; otherwise the BFF adapts the existing service contracts.

## Verification Plan

- Contract tests validate every operation in `contracts/browser-bff.openapi.yaml`, including auth enforcement and upstream status preservation.
- Frontend unit tests validate Zod schemas, API clients, error mapping, session state, optimistic cart rollback, and idempotency-key reuse.
- Existing Maven tests continue to validate product availability, cart ownership, order ownership, cart claiming, reservations, and checkout idempotency.
- Playwright validates sign-in, browse/search/detail, add/update/remove, checkout, confirmation reload, order history, logout, and protected-route redirection against real services.
- CI runs the same static and dynamic checks documented in [quickstart.md](quickstart.md).

## Complexity Tracking

No constitution violations require justification. The standalone BFF is a required security boundary, not an additional domain service: it owns browser sessions and translates browser-safe routes to existing service contracts.
