# Cart API for Frontend Clients

This document reflects the cart controller, DTOs, security configuration, and
exception handlers in `cart-service`.

## Base URL and authentication

- Local development: `http://localhost:8080`
- Docker Compose: `http://localhost:8081` (host port maps to container port `8080`)
- API base path: `/api/customer`

All endpoints require an OAuth2 Bearer JWT. Reads require `cart:read`; mutations
require `cart:write`. The customer comes from the token, not request data.

## Cart response

```json
{
  "id": 42,
  "status": "OPEN",
  "items": [{
    "id": 7,
    "productId": 12,
    "productName": "Apples",
    "price": 29.9,
    "quantity": 2
  }]
}
```

`status` is `OPEN` or `CHECKED_OUT`. Returned items contain `id`, `productId`,
`productName`, `price`, and `quantity`.

## Endpoints

| Method and path | Scope | Request | Success response |
| --- | --- | --- | --- |
| `POST /api/customer/cart` | `cart:write` | No body | `201 Created` and a cart. |
| `GET /api/customer/cart` | `cart:read` | No body | `200 OK` and the caller's current cart. |
| `GET /api/customer/carts/{cartId}` | `cart:read` | Path `cartId` (`int64`) | `200 OK` and the owned cart. |
| `POST /api/customer/cart/{cartId}/items` | `cart:write` | Add-item JSON | `200 OK` and the updated cart. |
| `PATCH /api/customer/cart/{cartId}/items/{itemId}` | `cart:write` | Quantity JSON | `200 OK` and the updated cart. |
| `DELETE /api/customer/cart/{cartId}/items/{itemId}` | `cart:write` | No body | `200 OK` and the updated cart. |
| `POST /api/customer/cart/{cartId}/checkout` | `cart:write` | No body | `200 OK`, status becomes `CHECKED_OUT`. |
| `POST /api/customer/cart/{cartId}/open` | `cart:write` | No body | `200 OK`, status becomes `OPEN`. |

### Add-item request

```json
{
  "productId": 12,
  "quantity": 2
}
```

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `productId` | integer (`int64`) | Yes | Present and greater than `0`. |
| `quantity` | integer | Yes | At least `1`. |

The add-item DTO also exposes `id`, `productName`, and `price`, but the
controller uses only `productId` and `quantity` from this request.

### Quantity request

```json
{ "quantity": 3 }
```

`quantity` must be at least `1`.

## Error responses

All application and security errors use this envelope. `timestamp` is generated
by the server and `path` is the requested URI.

```json
{
  "timestamp": "2026-09-17T14:45:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation Failed",
  "path": "/api/customer/cart/42/items",
  "validationErrors": { "quantity": "Quantity must be at least 1" }
}
```

| Status | Conditions | Message behavior |
| --- | --- | --- |
| `400 Bad Request` | DTO validation or malformed JSON | `Validation Failed` with a `validationErrors` field map; malformed JSON is `Malformed request body`. |
| `401 Unauthorized` | Missing or invalid JWT | `Authentication required`. |
| `403 Forbidden` | Missing scope or another customer's cart | `Access denied` for scope checks; ownership errors identify the cart. |
| `404 Not Found` | Cart, cart item, or product missing | Explains the missing resource. |
| `409 Conflict` | Cart already checked out, unavailable/insufficient stock, or concurrent update | Explains the conflict; concurrent updates instruct clients to reload and retry. |
| `503 Service Unavailable` | Product catalog unavailable | `Product catalog is temporarily unavailable`. |
| `500 Internal Server Error` | Other unhandled failures | `An unexpected error occurred`. |

`validationErrors` is set only for validation failures and may be omitted from
other error responses.
