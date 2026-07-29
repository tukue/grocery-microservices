# API Documentation

Each service exposes OpenAPI at `/v3/api-docs` and Swagger UI at `/swagger-ui/index.html`.

## Product Service

- `GET /products`: returns products as the legacy list response.
- `GET /products?page={page}&size={size}&sort={id|name|price}&direction={asc|desc}`: returns a paginated product response. `page` is zero-based and `size` is limited to 100.
- `GET /products/search?name={name}`: searches products by name.
- `GET /products/{id}`: returns one product, `404` if absent.
- `POST /products`: creates a product, returns `201`.
- `PUT /products/{id}`: updates a product.
- `DELETE /products/{id}`: deletes a product, returns `204`.

Validation: product `name` is required, `price` must be positive.

## Cart Service

- `POST /carts`: creates a cart, returns `201`.
- `GET /carts/{id}`: returns a cart with items, `404` if absent.
- `POST /carts/{cartId}/items`: adds an item.
- `DELETE /carts/{cartId}/items/{itemId}`: removes an item.

Validation: item `productName` is required, `price` must be non-negative, `quantity` must be at least 1.

## Order Service

- `POST /orders`: creates an order, returns `201`.
- `GET /orders/{id}`: returns one order, `404` if absent.
- `PATCH /orders/{id}/status?status={PENDING|COMPLETED|CANCELLED}`: changes status.

Validation: `cartId` is required, `productIds` must not be empty.

## Summary Service

- `POST /summaries`: creates a summary, returns `201`.
- `GET /summaries/{id}`: returns a summary, `404` if absent.
- `GET /summaries/{id}/receipt`: returns a formatted receipt.

Validation: `orderId` is required, `items` must not be empty, `total` must be positive.

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
