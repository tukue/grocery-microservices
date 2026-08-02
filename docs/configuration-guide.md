# Configuration Guide

## Profiles

- `test`: H2 in-memory database, security disabled in selected web tests, generated JWT signing values.
- `dev`: local H2 database and local ports.
- `docker`: Docker Compose PostgreSQL databases for local smoke testing. It uses Postgres trust auth and blank local-only credentials so CI can start and tear down the stack without committed secrets.
- `prod`: PostgreSQL, required externalized secrets, `ddl-auto=validate`, health details restricted.

## Required Production Configuration

Use environment variables or a secret manager for:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`

JWT signing values must be externally supplied and at least 32 characters long. Shorter values fail application startup.

Recommended production settings:

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.h2.console.enabled=false
management.endpoint.health.show-details=when_authorized
management.endpoints.web.exposure.include=health,info,prometheus
jwt.secret=${JWT_SECRET}
```

## Current Gaps

- Dev profiles still use `ddl-auto=update`, which is convenient but should not be used for production schema management.
- Real migrations are absent. Add Flyway or Liquibase before relying on PostgreSQL in production.
- JWT configuration is now fail-fast. Runtime profiles require `jwt.secret`; test profiles use generated values instead of committed signing material.
- Docker Compose previously used the `test` profile. It now uses `docker`, so services connect to the PostgreSQL containers and keep normal security enabled.
- Docker Compose intentionally avoids committed secret values and env-file dependencies. Use the `prod` profile, not `docker`, for any environment that needs real authentication or persistent data.
