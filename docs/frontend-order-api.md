# Order API for Frontend Clients

This document reflects the order controller, DTOs, security configuration, and
exception handlers in `order-service`.

## Base URL and authentication

- Local development: `http://localhost:8081`
- Docker Compose: `http://localhost:8082` (host port maps to container port `8080`)
- API base path: `/api/customer`

All endpoints require an OAuth2 Bearer JWT. Reads require `order:read`; checkout
and status changes require `order:write`. The customer comes from the token,
not request data.

## Order response

```json
{
  "id": 101,
  "userId": "customer-123",
  "cartId": 42,
  "status": "PENDING",
  "orderDate": "2026-09-17T14:45:00",
  "total": 59.8,
  "orderLines": [{
    "productId": 12,
    "productName": "Apples",
    "unitPrice": 29.9,
    "quantity": 2,
    "lineTotal": 59.8
  }]
}
```

`status` is `PENDING`, `COMPLETED`, or `CANCELLED`. `orderLines` is an empty
array when the persisted order has no lines.

## Endpoints

| Method and path | Scope | Request | Success response |
| --- | --- | --- | --- |
| `POST /api/customer/checkout` | `order:write` | Checkout JSON; optional `Idempotency-Key` header | `201 Created`, order body, and `Location: /api/customer/orders/{id}`. |
| `GET /api/customer/orders` | `order:read` | No body | `200 OK` and the caller's orders. |
| `GET /api/customer/orders/{id}` | `order:read` | Path `id` (`int64`) | `200 OK` and the owned order. |
| `PATCH /api/customer/orders/{id}/status?status={status}` | `order:write` | Path `id`; required status query parameter | `200 OK` and the updated order. |

### Checkout request and idempotency

```json
{
  "cartId": 42,
  "idempotencyKey": "checkout-42-20260917"
}
```

| Field or header | Type | Required | Rules |
| --- | --- | --- | --- |
| `cartId` | integer (`int64`) | Yes | Present and greater than `0`. |
| `idempotencyKey` body field | string | No | Maximum `64` characters. |
| `Idempotency-Key` header | string | No | Takes precedence over a non-blank body key; the resolved key is trimmed and must be at most `64` characters. |
| `X-Correlation-Id` header | string | No | Used for order-event correlation; it does not alter the HTTP response. |

If neither idempotency key is supplied, the service generates one. Repeating a
checkout with the same resolved key for the same customer returns the existing
order rather than creating another; the controller still returns `201` with
that order and its `Location`.

### Status update

`status` must exactly be one of `PENDING`, `COMPLETED`, or `CANCELLED`. Only a
`PENDING` order can change, and it can change only to `COMPLETED` or
`CANCELLED`.

## Error responses

All application and security errors use this envelope. `timestamp` is generated
by the server and `path` is the requested URI.

```json
{
  "timestamp": "2026-09-17T14:45:00",
  "status": 409,
  "error": "Conflict",
  "message": "Cart with id 42 is empty",
  "path": "/api/customer/checkout"
}
```

| Status | Conditions | Message behavior |
| --- | --- | --- |
| `400 Bad Request` | Checkout validation, malformed JSON, invalid status transition/value, or overlong resolved idempotency key | Validation uses `Validation Failed` and a `validationErrors` field map; malformed JSON uses `Malformed request body`. |
| `401 Unauthorized` | Missing or invalid JWT | `Authentication required`. |
| `403 Forbidden` | Missing scope, another customer's order, or cart access denied during checkout | Scope checks use `Access denied`; ownership and cart-access failures explain the denial. |
| `404 Not Found` | Order or checkout cart missing | Explains the missing resource. |
| `409 Conflict` | Empty/already checked-out cart, unavailable/insufficient stock, or concurrent update | Explains the conflict; concurrent updates instruct clients to reload and retry. |
| `503 Service Unavailable` | Cart or product service unavailable | Identifies the unavailable dependency. |
| `500 Internal Server Error` | Other unhandled failures | `An unexpected error occurred`. |

`validationErrors` is set only for DTO validation failures and may be omitted
from other error responses.
