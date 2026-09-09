# API Documentation

Each service exposes OpenAPI at `/v3/api-docs` and Swagger UI at `/swagger-ui/index.html`.

## Browser Integration

All services accept browser requests from the comma-separated origin allowlist in
`CORS_ALLOWED_ORIGINS`. Docker Compose accepts an empty value so lifecycle commands such as
`docker compose down` work; a service fails at startup until the value contains at least one
origin. Set it to the exact frontend origin for each environment. Requests may send `Authorization`,
`Content-Type`, and `X-Correlation-Id`;
responses expose `Location`. Cookie credentials are intentionally disabled because
authentication uses bearer tokens.

## Product Service

Catalog reads are public; writes require the `product:admin` scope.

- `GET /products`: returns products as the legacy list response.
- `GET /products?page={page}&size={size}&sort={id|name|price}&direction={asc|desc}`: returns a paginated product response. `page` is zero-based and `size` is limited to 100.
- `GET /products/search?name={name}`: searches products by name.
- `GET /products/{id}`: returns one product, `404` if absent.
- `POST /products`: creates a product, returns `201`.
- `PUT /products/{id}`: updates a product.
- `DELETE /products/{id}`: deletes a product, returns `204`.

Validation: product `name` is required, `price` must be positive.

## Cart Service

All cart endpoints require a bearer token with the `cart:read` or `cart:write` scope and operate only on the authenticated customer's own cart (`sub` claim). Accessing another customer's cart returns `404` (not `403`) to avoid leaking resource existence.

- `POST /api/customer/cart`: creates the current cart, returns `201`.
- `GET /api/customer/cart`: returns the current cart for the authenticated customer, `404` when none exists.
- `GET /api/customer/carts/{cartId}`: returns a cart with items, `404` if absent or owned by another customer.
- `POST /api/customer/cart/{cartId}/items`: adds an item.
- `PATCH /api/customer/cart/{cartId}/items/{itemId}`: updates an item's quantity and returns the canonical cart.
- `DELETE /api/customer/cart/{cartId}/items/{itemId}`: removes an item.

Validation: item `productName` is required, `price` must be non-negative, `quantity` must be at least 1.

## Order Service

All order endpoints require a bearer token with the `order:read` or `order:write` scope and are scoped to the authenticated customer. Accessing another customer's order returns `404`. Checkout forwards the caller's bearer token to the cart service, which enforces the same ownership rules.

- `POST /api/customer/checkout`: creates an order from the authenticated customer's cart, returns `201` and `Location: /api/customer/orders/{id}`.
- `GET /api/customer/orders`: returns orders for the authenticated customer.
- `GET /api/customer/orders/{id}`: returns one order, `404` if absent or owned by another customer.
- `PATCH /api/customer/orders/{id}/status?status={PENDING|COMPLETED|CANCELLED}`: changes status.

Validation: `cartId` is required, `productIds` must not be empty.

## Summary Service

Summary is a read-only projection produced asynchronously from `OrderCreatedEvent` messages. Endpoints require the `summary:read` scope and are always scoped to the authenticated customer.

- `GET /api/customer/summary`: returns the customer's aggregate summary (`orderCount`, `totalSpending`, `averageOrderAmount`, `recentOrders`).
- `GET /api/customer/summary/orders/{orderId}/receipt`: returns a formatted receipt, `404` if absent or owned by another customer.

## Error Response

Services return a consistent JSON shape for handled errors:

```json
{
  "timestamp": "2026-07-27T12:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation Failed",
  "path": "/products",
  "validationErrors": {
    "name": "Product name must not be blank"
  }
}
```

Authentication and authorization failures also use this shape:

- `401 Unauthorized`: missing, malformed, expired, or invalid bearer token.
- `403 Forbidden`: authenticated caller does not have permission for the endpoint.
