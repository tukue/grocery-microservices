# Spring Cloud Gateway Integration — Design & Implementation Spec

**Author:** Senior Backend Engineer  
**Date:** 2026-10-06  
**Status:** APPROVED FOR IMPLEMENTATION  
**Context:** Portfolio / consulting showcase repository

---

## 1. Problem Statement

The frontend currently talks to four separate backend services through a Node.js BFF
(Backend-for-Frontend). The BFF does two distinct jobs that should be separated:

1. **Session management** — exchanges credentials for a JWT, stores the token in a
   Redis-backed server-side session, and proxies API calls with the token injected.
2. **Service routing** — knows which backend URL to call for each URL pattern.

This conflation means:
- Any new client (mobile app, partner API, internal tooling) must replicate the Node.js
  routing logic or go through the BFF.
- CORS, rate limiting, and request tracing are scattered or absent.
- There is no single observability point for all traffic.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Single public entry point on `:8080` for every client type |
| G2 | Centralised CORS policy — services no longer need browser origins |
| G3 | JWT validation at the edge — downstream services get a pre-validated token |
| G4 | Redis-backed token-bucket rate limiting per client IP |
| G5 | Prometheus metrics + structured logs for every proxied request |
| G6 | The Node.js BFF session concern is preserved, not deleted |
| G7 | All routes are tested and the gateway compiles as a Maven module |

---

## 3. Non-Goals

- Replacing the embedded demo identity provider in `cart-service` (out of scope)
- Service discovery (Eureka/Consul) — static URLs are sufficient for this portfolio
- mTLS between gateway and services — internal network is trusted in Docker Compose
- Replacing Redis (already in docker-compose.yml, reused as-is)

---

## 4. Architecture Decision

### Chosen: Option C — Gateway as public edge, BFF as a special upstream

```
                        ┌─────────────────────────────────────────┐
                        │         Spring Cloud Gateway :8080       │
                        │                                          │
Browser / Mobile ──────►│  CORS  │  Rate Limit  │  JWT Validate   │
                        │                                          │
                        │  Route table:                            │
                        │  /api/auth/**      → BFF :3000           │
                        │  /api/catalog/**   → product-service     │
                        │  /api/customer/**  → cart / order / sum  │
                        │  /actuator/**      → gateway itself      │
                        └──────┬──────────────────────────────────┘
                               │  Authorization header forwarded
                               │  X-Correlation-Id injected
                               ▼
              ┌────────────────────────────────────┐
              │         Internal Docker network     │
              │                                     │
              │  BFF :3000   (session + login only) │
              │  cart-service :8080                 │
              │  order-service :8080                │
              │  product-service :8080              │
              │  summary-service :8080              │
              └────────────────────────────────────┘
```

### Why not Option A (Gateway between BFF and services)?
Two hops for every request. The BFF already does routing; adding a gateway behind it
doubles latency for no architectural gain.

### Why not Option B (Gateway replaces BFF entirely)?
The BFF session-cookie pattern is legitimate security practice for browser clients.
Removing it to simplify the demo would demonstrate less skill, not more.

### Why Option C?
- Single public port: demonstrates understanding of API gateway pattern
- BFF stays: demonstrates understanding of BFF pattern as a separate concern
- Gateway owns cross-cutting concerns: demonstrates separation of concerns
- A hiring engineer can see both patterns coexisting and understand when each applies

---

## 5. Route Table

| Public path | Upstream | Auth required | Strip prefix |
|---|---|---|---|
| `GET /api/catalog/products/**` | `product-service` | No | `/api/catalog` → `` |
| `POST /api/auth/login` | BFF | No | none |
| `POST /api/auth/logout` | BFF | No | none |
| `GET /api/auth/me` | BFF | Yes | none |
| `GET /api/customer/cart` | `cart-service` | Yes | `/api/customer` → `` |
| `POST /api/customer/cart` | `cart-service` | Yes | `/api/customer` → `` |
| `POST /api/customer/cart/{id}/items` | `cart-service` | Yes | `/api/customer` → `` |
| `PATCH/DELETE /api/customer/cart/{id}/items/{itemId}` | `cart-service` | Yes | `/api/customer` → `` |
| `POST /api/customer/checkout` | `order-service` | Yes | `/api/customer` → `` |
| `GET /api/customer/orders` | `order-service` | Yes | `/api/customer` → `` |
| `GET /api/customer/orders/{id}` | `order-service` | Yes | `/api/customer` → `` |
| `GET /api/customer/summaries/{id}` | `summary-service` | Yes | `/api/customer` → `` |
| `GET /actuator/health` | gateway | No | — |
| `GET /actuator/prometheus` | gateway | No | — |

---

## 6. Key Design Constraints

| ID | Constraint | Rationale |
|----|-----------|-----------|
| C1 | Gateway runs on WebFlux (Reactor Netty). **No** `spring-boot-starter-web` dependency. | WebFlux and Servlet are mutually exclusive on the same classpath. |
| C2 | Spring Cloud `2025.0.0` BOM aligned with Spring Boot `4.1.x`. | Mismatched BOMs cause silent version conflicts. |
| C3 | JWT validation uses the `issuer-uri` JWKS discovery endpoint, not a hardcoded secret. | Consistent with how all backend services validate tokens. |
| C4 | CORS is configured **only** on the gateway. Backend services' CORS policies are changed to allow only `http://gateway-service:8080` (internal). | Prevents browsers from bypassing the gateway and calling services directly. |
| C5 | Rate limiting uses the existing Redis instance (`redis:6379`) already in `docker-compose.yml`. No new infrastructure. | Reuse, no cost to the dev setup. |
| C6 | All config lives in `@ConfigurationProperties` records. No scattered `@Value`. | Testable, typed, IDE-navigable. |
| C7 | The gateway does **not** mint or transform tokens. It validates inbound tokens and forwards them unchanged via `Authorization` header. | Keeps token lifecycle in one place (cart-service demo IdP). |
| C8 | Gateway port inside Docker is `8080`, exposed on host as `8085` to avoid conflict with the four existing services. | Ports 8081–8084 are taken. |
| C9 | Multi-stage Dockerfile matching the pattern of the other four services. | Demonstrates production container hardening (non-root, read-only FS). |
| C10 | `@Profile("!test")` on `SecurityConfig` so tests can supply a no-op security chain. | Standard pattern already used in every other service. |

---

## 7. Acceptance Criteria

### AC-1: Gateway starts and routes catalog requests without authentication
```
Given the docker-compose stack is up
When  GET http://localhost:8085/api/catalog/products
Then  response status is 200
And   response body is the product list from product-service
And   no Authorization header is required
```

### AC-2: Protected routes return 401 without a token
```
Given the docker-compose stack is up
When  GET http://localhost:8085/api/customer/cart  (no Authorization header)
Then  response status is 401
And   WWW-Authenticate: Bearer header is present
```

### AC-3: Protected routes return 200 with a valid JWT
```
Given a valid JWT obtained from POST http://localhost:8085/api/auth/login
When  GET http://localhost:8085/api/customer/cart  (Authorization: Bearer <token>)
Then  response status is 200 or 404 (cart not found is ok, 401/403 is not)
```

### AC-4: Rate limiter returns 429 on burst
```
Given replenishRate=5 and burstCapacity=5
When  6 requests are sent in under 1 second from the same IP
Then  at least 1 response has status 429
And   Retry-After header is present on the 429 response
```

### AC-5: CORS pre-flight accepted for allowed origin
```
When  OPTIONS http://localhost:8085/api/catalog/products
      Origin: http://localhost:5173
      Access-Control-Request-Method: GET
Then  response status is 200
And   Access-Control-Allow-Origin: http://localhost:5173
```

### AC-6: CORS pre-flight rejected for unknown origin
```
When  OPTIONS http://localhost:8085/api/catalog/products
      Origin: https://evil.example.com
Then  Access-Control-Allow-Origin header is absent
```

### AC-7: Actuator health is reachable without authentication
```
When  GET http://localhost:8085/actuator/health
Then  response status is 200
And   body contains {"status":"UP"}
```

### AC-8: X-Correlation-Id is injected on every request
```
When  any request passes through the gateway
Then  the upstream service receives X-Correlation-Id header
And   the response includes X-Correlation-Id
```

### AC-9: Gateway module compiles in the Maven reactor
```
When  mvn clean compile -pl microservices/gateway-service
Then  exit code is 0
```

### AC-10: GatewayRoutesTest passes
```
When  mvn test -pl microservices/gateway-service -Dspring.profiles.active=test
Then  all route assertions pass without a running Redis or upstream service
```

---

## 8. File Inventory

```
microservices/gateway-service/
├── pom.xml                                          ← DONE
└── src/
    ├── main/
    │   ├── java/com/grocery/microservices/gateway/
    │   │   ├── GatewayApplication.java              ← DONE (needs review)
    │   │   └── config/
    │   │       ├── GatewayProperties.java           ← DONE (needs review)
    │   │       ├── SecurityConfig.java              ← DONE (needs review)
    │   │       ├── GatewayRoutesConfig.java         ← TODO (routes + rate limit)
    │   │       └── RateLimitConfig.java             ← TODO (KeyResolver bean)
    │   └── resources/
    │       ├── application.properties               ← TODO
    │       ├── application-dev.properties           ← TODO
    │       ├── application-docker.properties        ← TODO
    │       └── application-test.properties          ← TODO
    └── test/
        └── java/com/grocery/microservices/gateway/
            └── GatewayRoutesTest.java               ← TODO

Root changes:
  pom.xml                                            ← TODO (add module)
  microservices/docker-compose.yml                   ← TODO (add gateway service)
  frontend/.env                                      ← TODO (point to gateway)
  frontend/server/config.ts                          ← TODO (point to gateway)
```

---

## 9. Implementation Task List

### Task 1 — pom.xml ✅ DONE
**File:** `microservices/gateway-service/pom.xml`  
**Constraints met:** C1 (no servlet), C2 (Spring Cloud 2025.0.0 BOM), C5 (Redis reactive)

---

### Task 2 — Java configuration classes
**Files:**
- `GatewayApplication.java` ✅ DONE  
- `GatewayProperties.java` ✅ DONE  
- `SecurityConfig.java` ✅ DONE (review against C3, C4, C10)  
- `GatewayRoutesConfig.java` ← **NEXT**  
- `RateLimitConfig.java` ← **NEXT**

**Constraints:** C3, C4, C6, C7, C8, C10  
**Acceptance criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8

**Implementation notes for `GatewayRoutesConfig`:**
- Use `RouteLocatorBuilder` (programmatic, not YAML — shows Java fluency)
- Filters per route: `StripPrefix`, `AddRequestHeader(X-Correlation-Id, #{T(java.util.UUID).randomUUID().toString()})`
- Rate limiting filter on all `/api/customer/**` routes
- Circuit breaker hook ready (commented stub) — shows awareness without over-engineering

**Implementation notes for `RateLimitConfig`:**
- `KeyResolver` bean: resolve by `X-Forwarded-For` → fallback to `RemoteAddr`
- Named bean `ipKeyResolver` to avoid conflict with Spring's default

---

### Task 3 — Application properties
**Files:** `application.properties`, `application-dev.properties`, `application-docker.properties`, `application-test.properties`  
**Constraints:** C5, C6, C8  
**Acceptance criteria:** AC-7, AC-9

**Key property groups:**
```
gateway.cors-allowed-origins
gateway.services.cart-url / order-url / product-url / summary-url / bff-url
gateway.jwt.issuer-uri
gateway.jwt.audience
gateway.rate-limit.replenish-rate
gateway.rate-limit.burst-capacity
gateway.rate-limit.requested-tokens
spring.data.redis.host / port
```

---

### Task 4 — Dockerfile
**File:** `microservices/gateway-service/Dockerfile`  
**Constraints:** C9  
**Acceptance criteria:** AC-9 (image builds)

Pattern: identical to `cart-service/Dockerfile` (multi-stage, non-root, read-only FS)

---

### Task 5 — Register in root pom.xml
**File:** `pom.xml`  
**Constraint:** C9 (Maven reactor build)  
Add `<module>microservices/gateway-service</module>`

---

### Task 6 — docker-compose.yml
**File:** `microservices/docker-compose.yml`  
**Constraints:** C5 (reuse Redis), C8 (host port 8085)  
**Acceptance criteria:** AC-1 through AC-8

**Service definition key points:**
- `depends_on: redis` (condition: service_healthy)
- `depends_on: cart-service` (condition: service_healthy) for JWT issuer URI resolution
- Environment variables: `JWT_ISSUER_URI`, `JWT_AUDIENCE`, `CORS_ALLOWED_ORIGINS`, `REDIS_URL`
- `read_only: true`, `cap_drop: ALL`, `no-new-privileges:true` (matches other services)

---

### Task 7 — Update frontend BFF config
**Files:** `frontend/.env`, `frontend/server/config.ts`  
**Acceptance criteria:** BFF proxies through gateway instead of individual services

**Change:** BFF `serviceUrls` all point to `http://localhost:8085` (the gateway).
The gateway's route table then dispatches to the correct service.  
The BFF no longer needs to know individual service URLs.

---

### Task 8 — GatewayRoutesTest
**File:** `microservices/gateway-service/src/test/java/com/grocery/microservices/gateway/GatewayRoutesTest.java`  
**Constraints:** C10  
**Acceptance criteria:** AC-1, AC-2, AC-3, AC-7, AC-9, AC-10

**Test cases:**
1. `GET /actuator/health` → 200, no auth required
2. `GET /api/catalog/products` → routed to mock product-service, no auth required
3. `GET /api/customer/cart` without token → 401
4. `GET /api/customer/cart` with mock JWT → routed to mock cart-service, returns upstream response
5. `OPTIONS /api/catalog/products` with allowed origin → CORS headers present
6. `OPTIONS /api/catalog/products` with unknown origin → no CORS allow header

---

## 10. What this demonstrates to a hiring team

| Skill | Evidence |
|---|---|
| API gateway pattern | Gateway as single public entry point with route table |
| BFF pattern | Session/cookie concern preserved in Node.js, not conflated with routing |
| Spring WebFlux | Gateway runs on Reactor Netty, `ServerHttpSecurity`, reactive Redis |
| Security depth | JWT validation (not just relay), audience check, public/protected split |
| Typed configuration | `@ConfigurationProperties` records, no scattered `@Value` |
| Operational maturity | Rate limiting, correlation IDs, Prometheus metrics, health checks |
| Container hardening | Multi-stage Dockerfile, read-only FS, non-root, cap_drop |
| Testability | Route tests without live Redis or upstream services, `@Profile("!test")` security |
| Architectural judgment | Option C rationale written down, tradeoffs acknowledged |
