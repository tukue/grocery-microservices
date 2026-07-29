# Developer Guide

## Prerequisites

- Java 21.
- Maven 3.9 or a project Maven wrapper.
- Docker and Docker Compose for local PostgreSQL and smoke tests.

## Local Commands

Run all module tests:

```bash
mvn test -Dspring.profiles.active=test
```

Run one service:

```bash
mvn spring-boot:run -pl microservices/product-service -Dspring-boot.run.profiles=dev
```

Run the local stack:

```bash
cd microservices
docker compose up --build
```

## Engineering Guidelines

- Keep controllers thin: HTTP concerns, validation, and DTO mapping only.
- Keep transaction boundaries in services.
- Throw typed domain exceptions and handle them in `GlobalExceptionHandler`.
- Prefer constructor injection in production code.
- Use repository-specific fetch plans such as `@EntityGraph` instead of broad eager loading.
- Add MockMvc tests when changing API status codes, validation, or error bodies.

## Testing Priorities

- Controller tests for success, validation failure, and not-found paths.
- Service tests for business rules and transaction-side effects.
- Repository tests for query behavior and fetch plans.
- Testcontainers for PostgreSQL-specific behavior before production deployment.
