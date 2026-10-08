# Gateway Integration — Work Stash
# Created: 2026-10-06
# Purpose: Capture in-progress state so work can be resumed in any session
# Design: Option C (Gateway as public edge, BFF as upstream for session/auth)

---

## STATUS SUMMARY

| Task | Status | Files |
|------|--------|-------|
| 1. pom.xml | ✅ DONE | `microservices/gateway-service/pom.xml` |
| 2. Java config classes | ✅ DONE | 5 Java files (see §3) |
| 3. Application properties | ✅ DONE | 4 properties files |
| 4. Dockerfile | ✅ DONE | `microservices/gateway-service/Dockerfile` |
| 5. Root pom.xml module | ✅ DONE | `pom.xml` |
| 6. docker-compose.yml | ❌ PENDING | `microservices/docker-compose.yml` |
| 7. Frontend BFF config | ✅ DONE | `frontend/.env`, `frontend/server/config.ts` |
| 8. GatewayRoutesTest | ❌ PENDING | `microservices/gateway-service/src/test/...` |

---

## ARCHITECTURE (Option C — confirmed)

```
Browser / Mobile
       │
       ▼
 Gateway :8085 (host) / :8080 (container)   ← Spring Cloud Gateway (WebFlux)
       │
       ├─► /api/auth/**        → BFF :3000        (session + login)
       ├─► /api/catalog/**     → product-service  (public, no JWT)
       ├─► /api/customer/cart  → cart-service      (JWT required, rate limited)
       ├─► /api/customer/orders → order-service   (JWT required, rate limited)
       └─► /api/customer/summaries → summary-service (JWT required, rate limited)
```

Cross-cutting concerns owned by the gateway:
- CORS (single centralised policy)
- JWT validation (RS256, audience, issuer — not just relay)
- Redis token-bucket rate limiting (per client IP)
- X-Correlation-Id injection (GlobalFilter, per-request)
- Prometheus metrics

---

## §1 — COMPLETED FILES

### microservices/gateway-service/pom.xml
- Spring Cloud `2025.0.0` BOM
- `spring-cloud-starter-gateway` (WebFlux/Netty, NO spring-boot-starter-web)
- `spring-boot-starter-data-redis-reactive` (rate limiting)
- `spring-boot-starter-security` + `spring-boot-starter-oauth2-resource-server`
- `spring-boot-starter-actuator` + `micrometer-registry-prometheus`
- `spring-boot-starter-test` + `spring-security-test` (test scope)

### microservices/gateway-service/src/main/java/.../GatewayApplication.java
- Plain `@SpringBootApplication`, `SpringApplication.run`

### microservices/gateway-service/src/main/java/.../config/GatewayProperties.java
- `@ConfigurationProperties(prefix = "gateway")`
- Records: `Services(cartUrl, orderUrl, productUrl, summaryUrl, bffUrl)`
- Records: `Jwt(issuerUri, audience)`
- Records: `RateLimit(replenishRate, burstCapacity, requestedTokens)` with validation

### microservices/gateway-service/src/main/java/.../config/SecurityConfig.java
- `@EnableWebFluxSecurity`, `@Profile("!test")`
- `ServerHttpSecurity` (WebFlux, NOT HttpSecurity)
- Public paths: OPTIONS/**, /actuator/health, /actuator/info, /actuator/prometheus, GET /api/catalog/**
- Protected: everything else requires JWT
- JWT decoder via `jwkSetUri` (JWKS discovery from `gateway.jwt.issuer-uri`)
- CORS via reactive `CorsConfigurationSource` (allowed origins from `gateway.cors-allowed-origins`)
- `allowCredentials = false` (bearer tokens, not cookies)

### microservices/gateway-service/src/main/java/.../config/GatewayRoutesConfig.java
- `RouteLocatorBuilder` (programmatic Java DSL, not YAML)
- 8 routes: catalog-products, auth-login, auth-logout, auth-me, customer-cart, customer-checkout, customer-orders, customer-summaries
- `stripPrefix(2)` on all service routes
- `requestRateLimiter` filter on all /api/customer/** routes
- `X-Gateway-Version: 1.0` header on all routes
- Circuit breaker stubs (commented) for future Resilience4j integration
- Injects `KeyResolver ipKeyResolver` bean (from RateLimitConfig)

### microservices/gateway-service/src/main/java/.../config/RateLimitConfig.java
- `@Bean @Primary KeyResolver ipKeyResolver()`
- Resolves by `X-Forwarded-For` first → fallback to TCP remote address → "unknown"
- Javadoc explains production trust model (only accept XFF from known LB)

### microservices/gateway-service/src/main/java/.../filter/CorrelationIdFilter.java
- Implements `GlobalFilter`, `Ordered` (HIGHEST_PRECEDENCE + 1)
- Preserves existing `X-Correlation-Id` if already present (honours upstream tracing)
- Injects new UUID if absent
- Echoes ID on response via `addIfAbsent`

### microservices/gateway-service/src/main/resources/application.properties
- `spring.application.name=gateway-service`
- Actuator: health, info, prometheus
- Structured JSON logging pattern

### microservices/gateway-service/src/main/resources/application-dev.properties
- `server.port=8085`
- All service URLs at localhost:808x
- `gateway.cors-allowed-origins=http://localhost:5173,http://localhost:3000`
- `gateway.jwt.issuer-uri=http://localhost:8081` (cart-service demo IdP)
- Permissive rate limits (100/200)
- Redis at localhost:6379
- `logging.level.org.springframework.cloud.gateway=DEBUG`

### microservices/gateway-service/src/main/resources/application-docker.properties
- `server.port=8080`
- All service URLs use Docker Compose service names
- All sensitive values use `${ENV_VAR}` (no fallback for JWT config)
- Rate limits overridable via `GATEWAY_RATE_LIMIT_*` env vars

### microservices/gateway-service/src/main/resources/application-test.properties
- `server.port=0` (random port)
- Stub URLs at localhost:9991-9995
- Redis autoconfiguration excluded (no live Redis needed)
- Rate limits set high (no interference)

### microservices/gateway-service/Dockerfile
- Stage 1: `maven:3.9-eclipse-temurin-25` — copies parent pom + gateway pom + src
- Stage 2: `eclipse-temurin:25-jre-noble` — non-root `app` user, EXPOSE 8080
- Matches pattern of cart-service, order-service, etc.

### pom.xml (root)
- Added `<module>microservices/gateway-service</module>` before e2e-tests

### frontend/.env
- Replaced `CART_SERVICE_URL`, `ORDER_SERVICE_URL`, `PRODUCT_SERVICE_URL`
- With single `GATEWAY_URL=http://localhost:8085`
- Kept `REDIS_URL`, `JWT_AUDIENCE`, `BFF_PORT` unchanged

### frontend/server/config.ts
- `GATEWAY_URL` env var (replaces three separate service URLs)
- `ServiceUrls.cart`, `.order`, `.product` all point to `gatewayUrl`
- BFF no longer needs to know individual service locations

---

## §2 — PENDING TASK 6: docker-compose.yml addition

Add the following service block BEFORE the `cart-service:` entry in
`microservices/docker-compose.yml`:

```yaml
  gateway-service:
    build:
      context: ..
      dockerfile: microservices/gateway-service/Dockerfile
    container_name: gateway-service
    environment:
      SPRING_PROFILES_ACTIVE: docker
      JWT_ISSUER_URI: ${JWT_ISSUER_URI:-http://cart-service:8080}
      JWT_AUDIENCE: ${JWT_AUDIENCE:-grocery-api}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:5173,http://localhost:3000}
      GATEWAY_RATE_LIMIT_REPLENISH_RATE: ${GATEWAY_RATE_LIMIT_REPLENISH_RATE:-20}
      GATEWAY_RATE_LIMIT_BURST_CAPACITY: ${GATEWAY_RATE_LIMIT_BURST_CAPACITY:-40}
      GATEWAY_RATE_LIMIT_REQUESTED_TOKENS: ${GATEWAY_RATE_LIMIT_REQUESTED_TOKENS:-1}
    ports:
      - "8085:8080"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp
    depends_on:
      redis:
        condition: service_healthy
      cart-service:
        condition: service_healthy
    networks:
      - backend
```

---

## §3 — PENDING TASK 8: GatewayRoutesTest.java

Create at:
`microservices/gateway-service/src/test/java/com/grocery/microservices/gateway/GatewayRoutesTest.java`

Test class requirements:
- `@SpringBootTest(webEnvironment = RANDOM_PORT)`
- `@ActiveProfiles("test")`
- Uses `WebTestClient` (reactive, matches WebFlux)
- Uses `MockWebServer` (OkHttp3) to mock upstreams — avoids needing live services
- Test security config (separate class): `@TestConfiguration @Profile("test")` providing
  a permissive `SecurityWebFilterChain` that lets all requests through

Test cases to implement (mapped to acceptance criteria):

| Test method | AC | Verifies |
|---|---|---|
| `healthEndpointIsPublic` | AC-7 | GET /actuator/health → 200, no token |
| `catalogRouteIsPublicAndForwardsToProductService` | AC-1 | GET /api/catalog/products → 200, no token, mock upstream called |
| `protectedRouteReturns401WithoutToken` | AC-2 | GET /api/customer/cart, no auth → 401 |
| `correlationIdIsInjectedOnEveryRequest` | AC-8 | X-Correlation-Id present on forwarded request |
| `corsAllowedOriginReceivesHeader` | AC-5 | OPTIONS with allowed origin → Access-Control-Allow-Origin |
| `corsUnknownOriginReceivesNoHeader` | AC-6 | OPTIONS with evil origin → no allow header |

Dependencies needed in test scope (already in pom.xml via spring-boot-starter-test):
- `com.squareup.okhttp3:mockwebserver` — add explicitly to gateway pom.xml
- `org.springframework.boot:spring-boot-starter-test` (WebTestClient included via WebFlux)

---

## §4 — CONSTRAINTS REFERENCE (do not violate)

| ID | Rule |
|----|------|
| C1 | WebFlux only — no spring-boot-starter-web on gateway classpath |
| C2 | Spring Cloud 2025.0.0 BOM matched to Spring Boot 4.1.x |
| C3 | JWT via JWKS discovery, not hardcoded secret |
| C4 | Services' CORS locked to internal gateway origin in production |
| C5 | Reuse existing Redis — no new infrastructure |
| C6 | All config in @ConfigurationProperties records |
| C7 | Gateway validates tokens, does not mint or transform them |
| C8 | Host port 8085, container port 8080 |
| C9 | Multi-stage Dockerfile, non-root, read-only FS |
| C10 | @Profile("!test") on SecurityConfig |

---

## §5 — ACCEPTANCE CRITERIA REFERENCE

| AC | Passes when |
|----|-------------|
| AC-1 | GET /api/catalog/products → 200, no token needed |
| AC-2 | GET /api/customer/cart, no token → 401 + WWW-Authenticate |
| AC-3 | GET /api/customer/cart, valid JWT → 200 or 404 (not 401/403) |
| AC-4 | 6 rapid requests from same IP → ≥1 response is 429 + Retry-After |
| AC-5 | CORS preflight from allowed origin → Access-Control-Allow-Origin present |
| AC-6 | CORS preflight from unknown origin → no Access-Control-Allow-Origin |
| AC-7 | GET /actuator/health → 200, {"status":"UP"}, no token |
| AC-8 | Every request through gateway → X-Correlation-Id injected |
| AC-9 | mvn clean compile -pl microservices/gateway-service exits 0 |
| AC-10 | mvn test -pl microservices/gateway-service -Dspring.profiles.active=test passes |

---

## §6 — HOW TO RESUME

1. Open `microservices/docker-compose.yml`
2. Insert the gateway-service block from §2 before the `cart-service:` entry
3. Create `GatewayRoutesTest.java` per §3
4. Add `mockwebserver` dependency to `microservices/gateway-service/pom.xml`
5. Run: `mvn clean compile -pl microservices/gateway-service`
6. Run: `mvn test -pl microservices/gateway-service -Dspring.profiles.active=test`

To start the full stack:
```bash
cd microservices
CORS_ALLOWED_ORIGINS=http://localhost:5173 \
JWT_ISSUER_URI=http://cart-service:8080 \
JWT_AUDIENCE=grocery-api \
docker-compose up --build
```

Gateway public URL: http://localhost:8085
