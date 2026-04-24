# Order Service Improvement Plan (KISS)

Focus: Transactional Integrity and Clear Domain Logic.

## 1. ACID Compliance
- Ensure the `@Transactional` boundary covers the entire order creation process to prevent "partial" orders in the database.

## 2. Simple State Management
- Use a clear `OrderStatus` Enum (`PENDING`, `COMPLETED`, `CANCELLED`).
- Implement simple validation rules (e.g., cannot cancel a `COMPLETED` order).

## 3. Auditable Logs
- Log key lifecycle events (e.g., "Order #123 created by User X") in a structured format for easy troubleshooting.

## 4. Performance
- Use Spring Data JPA `Projections` for "Get Order" calls to fetch only the data needed for the UI, keeping the service snappy.
