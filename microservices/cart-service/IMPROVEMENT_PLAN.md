# Cart Service Improvement Plan (KISS)

Focus: Clean Code, Validation, and Basic Resilience.

## 1. Robust Input Validation
- Implement strict `@Valid` checks on all DTOs to ensure data integrity at the entry point.
- Ensure price and quantity cannot be negative.

## 2. Centralized Error Handling
- Use `@ControllerAdvice` to provide consistent, user-friendly error messages (e.g., "Cart not found" instead of a 500 stack trace).

## 3. Basic Resilience
- Use Spring's native `@Retryable` for database operations to handle transient connection hiccups without adding heavy libraries.

## 4. Documentation
- Keep Swagger/OpenAPI documentation up-to-date to show clear API contracts for consulting stakeholders.
