# Full-Stack AWS Evolution Roadmap

## Purpose

Evolve the current Spring Boot grocery microservices into a usable e-commerce web application with a React and TypeScript frontend, while retaining service ownership and deploying incrementally to AWS.

The customer journey is:

```text
Sign in -> Browse products -> Manage cart -> Checkout -> View order -> View receipt
```

## Principles

- Deliver one end-to-end customer flow at a time.
- Keep product, cart, order, and summary data owned by their existing services.
- Treat the browser as an untrusted client: prices, totals, and customer IDs remain server-derived.
- Use managed AWS services and existing containers before adding Kubernetes, a service mesh, or event infrastructure.
- Keep frontend API contracts typed and versioned through OpenAPI where practical.

## Target Architecture

```text
React + TypeScript SPA
        |
CloudFront + S3
        |
ALB /api path routing
        |
ECS Fargate: product | cart | order | summary
        |
RDS PostgreSQL (database per service)
```

- **Frontend:** React, TypeScript, Vite, React Router, and a small query/cache library such as TanStack Query.
- **Public API:** ALB path routing initially. Keep Spring controllers as the API boundary; introduce a BFF only if browser orchestration becomes duplicated or exposes unsuitable service contracts.
- **Identity:** Replace demo login with an OpenID Connect provider, preferably Amazon Cognito for the AWS deployment path.
- **Service networking:** Private ECS services use Cloud Map DNS names and security groups. No service mesh is needed for the MVP.

## Phase 0: Stabilize Contracts

**Outcome:** The frontend has safe, documented APIs to integrate with.

1. Publish OpenAPI for product, cart, order, and summary APIs.
2. Document request and error formats, including `400`, `403`, `404`, `409`, and `503` cases.
3. Generate or maintain TypeScript API types from the contracts.
4. Keep `PRODUCT_SERVICE_BASE_URL` and `CART_SERVICE_BASE_URL` externalized for every environment.

**Done when:** A TypeScript client can call every MVP endpoint without duplicating DTO definitions by hand.

## Phase 1: React Storefront Foundation

**Outcome:** Customers can use a deployed web UI to browse the catalog.

1. Create a `frontend/` React + TypeScript application using Vite.
2. Add routes for catalog, product details, cart, checkout, orders, and sign-in.
3. Implement a typed API client, loading states, empty states, and consistent error messages.
4. Add catalog listing, search, and product-detail views using `product-service` read endpoints.
5. Add component and API-client tests for the catalog happy path and failure state.

**Done when:** A user can browse and search products from the browser against the deployed product service.

## Phase 2: Identity and Cart Ownership

**Outcome:** A signed-in customer can manage only their own cart.

1. Configure Cognito user pool, app client, hosted sign-in or application sign-in flow, and callback URLs.
2. Validate Cognito JWTs in each Spring service using issuer and JWK configuration; remove static demo credentials.
3. Create or load the authenticated customer's cart from the frontend.
4. Add add-to-cart, quantity update, remove-item, and cart summary UI flows.
5. Preserve ownership checks in `cart-service`; never accept a customer ID from React.

**Done when:** Two users cannot read or mutate each other's cart, and the browser can recover gracefully from `403` and expired sessions.

## Phase 3: Trusted Checkout and Orders

**Outcome:** Customers can create and review an order without controlling financial values.

1. Build checkout confirmation UI from the cart snapshot.
2. Call `POST /orders/checkout` with only the cart identifier.
3. Display trusted order lines, total, status, and receipt/summary after creation.
4. Add customer order-history and order-detail APIs with ownership checks.
5. Mark the cart checked out or clear it only after successful order persistence; make repeated checkout behavior explicit.

**Done when:** A customer can complete checkout, refresh the page, and see the same immutable order total and lines.

## Phase 4: AWS MVP Environment

**Outcome:** The full customer flow is reachable through one HTTPS domain.

1. Build frontend artifacts in CI and deploy them to a private S3 bucket behind CloudFront.
2. Build each Spring service image, scan it, and publish it to Amazon ECR.
3. Deploy services to ECS Fargate in private subnets with Cloud Map service discovery.
4. Route `/api/products`, `/api/carts`, `/api/orders`, and `/api/summaries` through an HTTPS ALB using ACM certificates.
5. Use RDS PostgreSQL with one database per service and Secrets Manager for database credentials and JWT/OIDC settings.
6. Store non-secret configuration in ECS task definitions or Parameter Store; do not commit AWS credentials or service URLs.

**Done when:** The application is deployed through CI, the SPA loads through CloudFront, and checkout works over HTTPS using ECS service DNS.

## Phase 5: Operational MVP Readiness

**Outcome:** The team can safely demonstrate and diagnose the deployed application.

1. Configure ECS and ALB health checks using Spring Actuator health endpoints.
2. Send structured service logs to CloudWatch with request and order identifiers.
3. Add CloudWatch alarms for unhealthy tasks, elevated 5xx responses, and RDS storage/connections.
4. Add a smoke test after deployment: catalog read, authenticated cart operation, checkout, and order retrieval.
5. Run database migrations through a controlled tool before adopting stricter production schema validation.

**Done when:** A failed service task is replaced automatically, alerts identify customer-impacting failures, and deployment smoke tests protect the main flow.

## Deferred Until Demand Is Proven

- Kubernetes, service mesh, and distributed tracing platforms.
- Kafka/SQS event choreography and distributed sagas.
- Redis caching beyond demonstrated catalog-performance needs.
- Multi-region deployment, advanced autoscaling, and complex payment workflows.

## Delivery Order

1. Stabilize API contracts and TypeScript types.
2. Deliver catalog browsing in React.
3. Integrate real identity and cart ownership.
4. Deliver checkout, orders, and receipts.
5. Deploy the complete flow to AWS ECS, RDS, S3, and CloudFront.
6. Add operational checks and iterate from real customer feedback.
