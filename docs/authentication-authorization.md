# Authentication & Authorization Guide

## Purpose and Boundaries

All four microservices (`cart-service`, `order-service`, `product-service`, `summary-service`)
are **OAuth2 / OpenID Connect resource servers**. They never implement login themselves; they
validate bearer access tokens issued by an identity provider and authorize each request based on
the token's claims.

| Concern | Owner | Responsibility |
| --- | --- | --- |
| Identity provider | Platform / security team | Issue RS256-signed access tokens with `sub`, `iss`, `aud`, `exp`, `scope`. |
| Token validation | Each microservice | Verify signature, algorithm, issuer, audience, timestamps, and `sub`. |
| Authorization | Each microservice | Map the `scope` claim to authorities and enforce `@PreAuthorize` per endpoint. |
| Cross-service calls | `order-service` | Forward the caller's bearer token to `cart-service`; the downstream service re-enforces the same ownership rules. |
| Session / login UI | Frontend | Obtain a token from the IdP, store it, attach `Authorization: Bearer` to every protected call, and handle 401/403. |

There is **no shared signing secret between services** and no `X-Internal` header backdoor. Each
service independently trusts the issuer configured by `security.jwt.issuer-uri`, so one token works
across the whole API surface.

## Security Model

### Bearer-token resource server

- Sessions are stateless (`SessionCreationPolicy.STATELESS`) and CSRF is disabled: the browser never
  sends cookies; it sends `Authorization: Bearer <token>`.
- Filters are JWT-based (`oauth2ResourceServer().jwt(...)`). A missing or invalid token reaches the
  `SecurityExceptionHandler` entry point, which returns `401`.
- CORS is configured from `app.cors.allowed-origins` (comma-separated). Allowed methods are
  `GET, POST, PUT, PATCH, DELETE, OPTIONS`; allowed headers are `Authorization, Content-Type,
  X-Correlation-Id`; only `Location` is exposed. Credentials (`cookies`) are disabled.

### Token validation chain

`LazyJwtDecoder` resolves the issuer once (OIDC discovery at `{issuer}/.well-known/openid-configuration`,
then JWKS for signature verification) and validates every token with:

| Validator | Enforces |
| --- | --- |
| `SubjectClaimValidator` | `sub` is present and non-blank (identity baseline). |
| `JwtTimestampValidator` | `exp`/`nbf`/`iat` are within the current time. |
| `JwtIssuerValidator` | `iss` equals `security.jwt.issuer-uri`. |
| `AudienceValidator` | `aud` (string or array) contains `security.jwt.audience`. |
| `AllowedAlgorithmValidator` | header `alg` is `RS256` (configurable via `security.jwt.algorithm`). |

The combination of the algorithm check and issuer discovery prevents confusion/algorithm-switching
attacks: the signing key always comes from the configured issuer, never from the token itself.

### Identity principal

`CustomerJwtAuthenticationConverter` reads the immutable `sub` claim and exposes it to controllers as
`AuthenticatedCustomer` via `@AuthenticationPrincipal`. Domain code never reads raw JWT claims or the
Spring Security context; it always asks for `customer.customerId()`. Claims such as `email` or
`preferred_username` are **not** used as identity because they are mutable and not guaranteed unique.

### Authorization (scopes)

The `scope` claim becomes authorities with the `SCOPE_` prefix (for example `scope: "cart:write"`
becomes authority `SCOPE_cart:write`) and is enforced with method security:

```java
@PreAuthorize("hasAuthority('SCOPE_cart:write')")
```

Scope grants are the only authorization mechanism. The frontend must request the scopes the features
it renders actually require; scopes are checked per service.

## Scope and Endpoint Matrix

Scopes across the platform: `cart:read`, `cart:write`, `order:read`, `order:write`, `summary:read`,
`product:admin`.

### Cart service

| Endpoint | Scope | Notes |
| --- | --- | --- |
| `POST /api/me/cart` | `cart:write` | Create the current cart. |
| `GET /api/me/cart` | `cart:read` | Current cart, `404` when none exists. |
| `GET /api/me/carts/{cartId}` | `cart:read` | `404` if owned by another customer. |
| `POST /api/me/cart/{cartId}/items` | `cart:write` | |
| `PATCH /api/me/cart/{cartId}/items/{itemId}` | `cart:write` | |
| `DELETE /api/me/cart/{cartId}/items/{itemId}` | `cart:write` | |

### Order service

| Endpoint | Scope | Notes |
| --- | --- | --- |
| `POST /api/me/checkout` | `order:write` | Creates the order and forwards the caller's bearer token to `cart-service` (`GET /api/me/carts/{cartId}`); a missing `Authorization` header is rejected before the call. |
| `GET /api/me/orders` | `order:read` | Only the caller's orders. |
| `GET /api/me/orders/{id}` | `order:read` | `404` if owned by another customer. |
| `PATCH /api/me/orders/{id}/status` | `order:write` | |

### Product service

| Endpoint | Scope | Notes |
| --- | --- | --- |
| `GET /products`, `GET /products/search…`, `GET /products/{id}` | public | Reads require no token (`permitAll`). |
| `POST /products` | `product:admin` | |
| `PUT /products/{id}` | `product:admin` | |
| `DELETE /products/{id}` | `product:admin` | |

### Summary service (read-only projection)

| Endpoint | Scope | Notes |
| --- | --- | --- |
| `GET /api/me/summary` | `summary:read` | Aggregates `orderCount`, `totalSpending`, `averageOrderAmount`, `recentOrders`. |
| `GET /api/me/summary/orders/{orderId}/receipt` | `summary:read` | `404` if not ready or owned by another customer. |

### Public endpoints on every service

`/swagger-ui/**`, `/v3/api-docs/**`, `/swagger-resources/**`, `/webjars/**`, `/actuator/health`,
`/actuator/info` are always public. In the `dev` profile only, `/auth/login` and `/.well-known/**`
(demo identity provider) are additionally public.

## Ownership Isolation (404, not 403)

Queries are scoped by the authenticated customer at the repository level, so a request for another
customer's cart/order/receipt behaves exactly like a request for a nonexistent resource (`404`).
This avoids leaking which IDs exist. Only scope violations produce `403`.

## Error Semantics

Handled errors use one JSON shape containing `status`, `error`, `message`, and `path`:

| Status | Meaning | Produced by |
| --- | --- | --- |
| `401 Unauthorized` | Missing, malformed, expired, wrong-issuer/audience/algorithm, or invalid-signature token. | `SecurityExceptionHandler` (filter level) |
| `403 Forbidden` | Authenticated token lacks the required scope (`@PreAuthorize` denial) or hits filter-level access denial. | `GlobalExceptionHandler`/`SecurityExceptionHandler` |
| `404 Not Found` | Resource absent or owned by another customer. | `GlobalExceptionHandler` |

## Demo Identity Provider (dev only)

Each service embeds an ephemeral RSA-2048 identity provider, activated only with the `dev` profile
and `security.jwt.demo-enabled=true`:

- `POST /auth/login` with `{ "username": "user", "password": "password" }` returns `{ "token", "type": "Bearer" }`.
- `GET /.well-known/openid-configuration` and `GET /.well-known/jwks.json` serve OIDC discovery and the public key set.
- Minted tokens: RS256, `sub=customer-f7b1b25c`, `aud=grocery-api`, TTL 300s, and all scopes
  `cart:read cart:write order:read order:write summary:read product:admin`.

```sh
curl -s -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"password"}'
# {"token":"eyJhbGciOi..."}
```

The keys are generated in-memory at startup and lost on restart. Never enable demo auth in
`prod`; the production profile forces it off (`security.jwt.demo-enabled=false`).

## Configuration Reference

Properties in the `security.jwt.*` namespace:

| Property | Environment override | Default | Purpose |
| --- | --- | --- | --- |
| `security.jwt.issuer-uri` | `JWT_ISSUER_URI` | required in `docker`/`prod`; `DEMO_IDENTITY_BASE_URL` in `dev` | OIDC issuer used for discovery + JWKS; also the expected `iss`. |
| `security.jwt.audience` | `JWT_AUDIENCE` | `grocery-api` (dev/test) | Required `aud` claim, shared across services. |
| `security.jwt.algorithm` | — | `RS256` | Allowed signing algorithm. |
| `security.jwt.demo-enabled` | — | `true` in `dev`, `false` otherwise | Whether the embedded demo IdP is active. |
| `security.jwt.demo-sub` / `-username` / `-password` / `-scopes` / `-token-ttl-seconds` | — | `customer-f7b1b25c` / `user` / `password` / all scopes / `300` | Demo token contents. |
| `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | required (non-empty) | Comma-separated browser origins. |

Profile behavior:

| Profile | Database | JWT |
| --- | --- | --- |
| `test` | H2 | Real validation against a test-only RSA keypair (`TestJwtSupport`), no network. |
| `dev` | H2 | Embedded demo IdP on each service's own URL. |
| `docker` | PostgreSQL (compose) | External IdP required; unresolved `JWT_ISSUER_URI`/`JWT_AUDIENCE` fail startup. |
| `prod` | PostgreSQL | External IdP required; demo disabled; fail-fast on missing `JWT_ISSUER_URI`/`JWT_AUDIENCE`. |

## How to Integrate with the Full Stack (Frontend)

The browser is a public client: it logs in at the identity provider, gets an access token, and sends
it to the API. The microservices do not serve login pages.

### 1. Authentication flow

```text
1. User signs in at the IdP (or demo: POST /auth/login on any dev service).
2. IdP returns an RS256 access token with scope, sub, iss (your configured issuer), aud (grocery-api).
3. The frontend attaches:  Authorization: Bearer <token>  to every API call.
4. On HTTP 401 the frontend clears the session and returns to sign-in.
   On HTTP 403 it keeps the session but shows a permission message.
   Neither is retried automatically.
```

In production all four services validate against the same `JWT_ISSUER_URI`/`JWT_AUDIENCE`, so the
single access token issued at login works against every service. Request the scopes your features
need at login (typically `cart:read cart:write order:read order:write summary:read`, plus
`product:admin` only for catalogue administration).

### 2. Local development with the demo IdP (single issuer)

Each service defaults its `dev` issuer to its own port, so cross-service demo calls need one shared
issuer. Run all services on the host and point every service at the cart demo issuer:

```properties
# set for cart, order, product, summary before starting the dev services
DEMO_IDENTITY_BASE_URL=http://localhost:8080
```

Then sign in once (cart's endpoint), and use the returned token against all four services.

```sh
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"password"}' | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/me/cart        # cart
curl -H "Authorization: Bearer $TOKEN" http://localhost:8083/products           # public
```

### 3. Browser client rules

- Use a **single API client** module that attaches the `Authorization` header, adds the
  `X-Correlation-Id` header, and maps the backend JSON error shape to a typed error.
- Read `Location` on `201` responses (for example checkout returns
  `Location: /api/me/orders/{id}`).
- Cart mutations return the authoritative cart — replace local state with the response; never
  recalculate totals client-side.
- After checkout, the summary is built asynchronously (Kafka). Show **Order confirmed** immediately
  and, only if the user asks for a receipt, poll
  `GET /api/me/summary/orders/{orderId}/receipt` with bounded retries; `404` means "pending or not
  yours", never failure.
- Receipt-triggered flow depends on the `summary:read` scope; include it in your token scopes.

Example (fetch):

```js
const res = await fetch(`${API_BASE}/api/me/orders`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
if (res.status === 401) { /* clear session, redirect to sign-in */ }
if (res.status === 403) { /* show permission message, keep session */ }
```

### 4. Token storage

Cookies are disabled on the backend. The frontend must choose a storage model and document its risk:
- **In-memory** (module variable): safest against XSS token theft, but tokens are lost on refresh.
- **sessionStorage**: survives refresh, cleared on tab close; slight XSS exposure.
- **httpOnly, Secure, SameSite cookie**: only viable if the identity provider issues cookies for the
  deployment domain; strongest against XSS. Do not hold long-lived secrets in `localStorage`.

### 5. Swagger/OpenAPI

Every service exposes `/swagger-ui/index.html` and `/v3/api-docs` without authentication. You can
"Authorize" (the lock icon) with a bearer token to exercise protected endpoints interactively.

## Testing

- Controller/service tests run a real validation chain with a **test-only RSA keypair**
  (`TestJwtSupport.jwtDecoder()`), including `SubjectClaimValidator`, issuer, audience, timestamp,
  and RS256 checks — no network, no committed private keys.
- `TestSecurityConfig` mounts that chain; tests mint tokens with `TestJwtSupport.validToken(sub, scopes)`.
- Security-matrix tests assert that expired tokens, wrong signature, wrong issuer, wrong audience,
  missing `sub`, and missing tokens are rejected with `401`.

## Operations: Key Rotation

Rotating keys is an IdP-level operation. Publish the new signing keys to the issuer's JWKS before
the old keys expire; each service re-fetches JWKS from discovery. There is no per-service secret to
rotate. Rotate the issuer or audience only by coordinated config change across all services.

## Related Documents

- [API Documentation](api-documentation.md) — endpoint, validation, and response details.
- [Frontend Integration Contract](frontend-integration.md) — browser UX contract and acceptance flow.
- [Configuration Guide](configuration-guide.md) — properties and profile behavior.