# Microservices Improvement Plan (KISS)

This document outlines the high-value, low-complexity improvements planned for each microservice. The goal is to demonstrate "Best-in-Class" consulting standards by prioritizing clean code, robust validation, and maintainability.

---

## 1. Global Standards (All Services)
- **Centralized Error Handling**: Implement `@ControllerAdvice` to provide consistent API error responses.
- **Robust Validation**: Enforce strict `@Valid` checks on all incoming DTOs.
- **Observability**: Ensure consistent JSON logging and standardized health check endpoints.

---

## 2. Cart Service
*Focus: Validation and Resilience.*
- **Input Integrity**: Add JSR-303 annotations to ensure prices and quantities are valid.
- **Basic Resilience**: Implement Spring's native `@Retryable` for database operations to handle transient connection issues.
- **API Documentation**: Maintain comprehensive OpenAPI (Swagger) contracts.

## 3. Order Service
*Focus: Transactional Integrity and State Management.*
- **ACID Compliance**: Ensure `@Transactional` boundaries cover the entire order lifecycle.
- **State Clarity**: Use a clear `OrderStatus` Enum and simple transition validation (e.g., prevent cancellation of completed orders).
- **Audit Logs**: Log key lifecycle events in a structured format for troubleshooting.

## 4. Product Service
*Focus: Performance and Data Quality.*
- **Catalog Caching**: Use Spring's `@Cacheable` for the product list to minimize database hits.
- **Simple Search**: Implement basic keyword filtering using standard JPA methods (no external search engines required).
- **Demo Assets**: Use placeholder/SVG image strategies to keep the repo visually complete without external dependencies.

## 5. Summary Service
*Focus: Reporting and Decoupling.*
- **Clear Reporting**: Format receipts for maximum readability (Date, Items, Total, Tax).
- **Pure Domain Logic**: Decouple calculation logic into testable Java classes, independent of the web layer.
- **Traceability**: Link every summary to its parent Order ID for easy cross-referencing.
