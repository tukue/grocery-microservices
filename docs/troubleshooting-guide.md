# Troubleshooting Guide

## Service Does Not Start

- Check Java version: `java -version` should report Java 21.
- Check the active profile: `SPRING_PROFILES_ACTIVE`.
- Check database URL, username, password, and container health.

## API Returns 401

- `/auth/**`, Swagger, `/actuator/health`, and `/actuator/info` are public.
- Other endpoints require `Authorization: Bearer <token>`.
- Malformed bearer tokens are ignored by the JWT filter and should result in unauthorized access, not a server error.

## Database Issues

- Local test/dev profiles use H2.
- Docker Compose provisions PostgreSQL containers.
- If entity schema changes fail in production, add migrations and stop relying on Hibernate DDL generation.

## Observability

- Health: `/actuator/health`.
- Metrics: `/actuator/prometheus` when enabled.
- Logs use a JSON-like console pattern in local properties.

## Common Build Issue

If `mvn` is not found, install Maven 3.9 or add a Maven wrapper to the repository.
