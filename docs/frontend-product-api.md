# Product API for Frontend Clients

This document describes the product endpoints implemented by `product-service`.
It is based on `ProductController`, `ProductDTO`, and the service's exception
handler; it does not describe planned endpoints or fields.

## Base URL and authentication

- Use the environment-specific product-service base URL configured by the
  deployment, followed by `/products`.

Catalog read endpoints are public. Product mutations require a valid token
with the `product:admin` scope. The service is stateless and does not use CSRF
protection. Swagger and OpenAPI routes are public, but they are not product API
endpoints.

## Product representation

Successful product responses use this JSON shape:

```json
{
  "id": 1,
  "name": "Apples",
  "description": "Crisp apples for snacks and baking.",
  "price": 29.9,
  "currency": "SEK",
  "available": true,
  "stockQuantity": 100,
  "imageUrl": "https://images.example.com/products/apples.jpg"
}
```

| Field | Type | Request | Response | Rules |
| --- | --- | --- | --- | --- |
| `id` | integer (`int64`) | Accepted but not required | Present for persisted products | The path `id` takes precedence on `PUT /products/{id}`. |
| `name` | string | Required | Present | Must contain at least one non-whitespace character. |
| `description` | string | Required | Present | Must contain at least one non-whitespace character and no more than 2000 characters. |
| `price` | number (`double`) | Required | Present | Must be greater than `0`; zero and negative values are invalid. |
| `currency` | string | Required | Present | Three uppercase ISO 4217 letters, for example `SEK`. |
| `available` | boolean | Required | Present | Whether the product can currently be purchased. |
| `stockQuantity` | integer | Required | Present | Must not be negative. |
| `imageUrl` | string | Optional | Present when available | Product image URL. |

`POST` and `PUT` receive the same `ProductDTO`. The controller does not define
any additional request fields.

## Endpoints

### List products

`GET /products`

Returns `200 OK` and a JSON array of product representations. An empty catalog
is returned as `[]`.

### Get one product

`GET /products/{id}`

Returns `200 OK` and one product representation when found. A missing product
returns the standard `404` error described below.

### Create a product

`POST /products`

Send `Content-Type: application/json` and a product request body:

```json
{
  "name": "Apples",
  "description": "Crisp apples for snacks and baking.",
  "price": 29.9,
  "currency": "SEK",
  "available": true,
  "stockQuantity": 100,
  "imageUrl": "https://images.example.com/products/apples.jpg"
}
```

On success the endpoint returns `201 Created` with the saved product
representation, including its generated `id`.

### Update a product

`PUT /products/{id}`

Send `Content-Type: application/json` and the same validated request body as
for `POST`. On success the endpoint returns `200 OK` with the saved product.
The controller assigns the path `id` to the entity, so a request-body `id` is
ignored for the update target. The controller calls `save` directly and does
not first check that the path `id` already exists; clients must not assume a
missing id produces `404` for this endpoint.

### Delete a product

`DELETE /products/{id}`

Returns `200 OK` with an empty response body when the product is deleted. A
missing product returns the standard `404` error described below.

## Error responses

The controller advice returns the following application error envelope:

```json
{
  "code": "NOT_FOUND",
  "message": "Product not found with id: 99",
  "errors": {}
}
```

| Status | When | `code` | `message` | `errors` |
| --- | --- | --- | --- | --- |
| `400 Bad Request` | A product request fails DTO validation | `VALIDATION_FAILED` | `Request validation failed` | Object whose keys are invalid field names and whose values are validation messages. |
| `404 Not Found` | A requested product does not exist for `GET` or `DELETE` | `NOT_FOUND` | `Product not found with id: {id}` | `{}` |
| `500 Internal Server Error` | An unhandled exception reaches the controller advice | `INTERNAL_ERROR` | `An unexpected error occurred` | `{}` |

Validation messages include `Product name must not be blank`,
`Product description must not be blank`, `Product price must be positive`, and
`Product currency must be a three-letter ISO 4217 code`. The API does not expose a
controller-defined error envelope for authentication failures or path values
that cannot be converted to `Long`; frontend clients should handle those as
HTTP error responses without relying on this envelope.
