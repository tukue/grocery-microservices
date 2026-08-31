# Backend Implementation Skill

Use this evolving guide for Spring Boot microservice changes in this repository.

## Delivery Model

Implement a complete MVP vertical slice:

```text
Validated request -> Controller -> Service rule -> Repository/downstream client -> Response -> Tests
```

## Current Practices

- Controllers use validated DTOs and derive callers from Spring Security `Authentication`.
- Services own business rules, transactions, resource ownership checks, and state transitions.
- Cart and order reads and mutations compare the authenticated JWT principal with the persisted resource owner; mismatches return `403`.
- Product-service owns prices, availability, and stock. Cart-service stores catalog snapshots and rejects unavailable or insufficient-stock additions.
- Checkout accepts a cart ID, derives totals server-side from trusted cart snapshots, and persists immutable order lines.
- Service URLs and timeouts are externalized; deployed calls do not depend on localhost defaults.
- Central exception handlers expose customer-safe `400`, `403`, `404`, `409`, and `503` responses.
- Tests cover success, validation/business failures, authorization denial, and no persistence after rejected operations.

## Implementation Rules

1. Confirm the feature improves a real MVP customer flow.
2. Never trust client-provided prices, totals, product snapshots, or customer IDs.
3. Keep controllers thin and place rules in the owning service.
4. Apply ownership authorization to every resource operation, including status changes.
5. Use small explicit downstream clients with bounded timeouts and clear error mapping.
6. Run affected tests and update roadmap/improvement documentation.

## Review Questions

- Is input validated at the API boundary?
- Is the caller authorized for this exact resource?
- Does the owning service derive business-critical values?
- Does failure avoid persistence and return a meaningful status?
- Do tests cover the important success and failure paths?

## Maintenance

Update this file after meaningful feature work, security reviews, or recurring implementation lessons. See `docs/backend-engineering-specification.md` for expanded guidance.
