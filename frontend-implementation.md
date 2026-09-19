# Frontend Implementation Design

## Overview

The frontend is a React + TypeScript SPA built with Vite, consuming the grocery microservices backend. It follows a **Ports & Adapters** (Hexagonal) architecture to keep UI, API, and domain logic decoupled and independently testable.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│  ProductCard, CartItem, CartPage, QuantityControl│
│  ─────────────────────────────────────────────── │
│  React components. Own UI state only.            │
│  Receive adapters via props (dependency inject). │
└────────────────────┬────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────┐
│                Adapter Layer                     │
│  cart-adapter.ts, product-adapter.ts,            │
│  order-adapter.ts, update-quantity.ts,           │
│  remove-item.ts                                  │
│  ─────────────────────────────────────────────── │
│  Typed fetch() wrappers. One function per        │
│  endpoint. Handles auth, errors, validation.     │
└────────────────────┬────────────────────────────┘
                     │ parses with
┌────────────────────▼────────────────────────────┐
│              Transport Layer                     │
│  order-schemas.ts (Zod)                          │
│  ─────────────────────────────────────────────── │
│  Validates raw JSON at the network boundary.     │
│  Catches unexpected backend responses before     │
│  they reach domain types.                        │
└────────────────────┬────────────────────────────┘
                     │ maps to
┌────────────────────▼────────────────────────────┐
│               Domain Layer                       │
│  types/order.ts                                  │
│  ─────────────────────────────────────────────── │
│  Plain TS interfaces. No framework deps.         │
│  Shared vocabulary between adapters and UI.      │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
frontend/src/
├── features/
│   ├── cart/
│   │   ├── api/
│   │   │   ├── cart-adapter.ts        # Cart CRUD adapter
│   │   │   ├── update-quantity.ts     # Quantity update with validation
│   │   │   └── remove-item.ts         # Item removal adapter
│   │   ├── components/
│   │   │   ├── AddToCartButton.tsx     # Add-to-cart with submit guard
│   │   │   ├── CartItem.tsx            # Line item with remove action
│   │   │   ├── CartPage.tsx            # Full cart view
│   │   │   ├── CartSummary.tsx         # Subtotal display
│   │   │   └── QuantityControl.tsx     # Increment/decrement control
│   │   └── __tests__/                  # Co-located tests
│   ├── products/
│   │   ├── api/
│   │   │   └── product-adapter.ts      # Product catalog adapter
│   │   ├── components/
│   │   │   └── ProductCard.tsx          # Product display + add to cart
│   │   └── __tests__/
│   └── orders/
│       ├── api/
│       │   ├── order-schemas.ts        # Zod validation schemas
│       │   └── order-adapter.ts        # Checkout submission adapter
│       ├── types/
│       │   └── order.ts                # Domain model types
│       └── __tests__/
├── test/
│   └── setup.ts                        # Vitest + testing-library setup
└── vite-env.d.ts                       # Asset type declarations
```

## Design Decisions

### 1. Adapter Injection via Props

Components receive adapters as props rather than importing them directly.

```tsx
// Good: testable, swappable
<AddToCartButton adapter={adapter} productId={42} available={true} />

// Bad: coupled, untestable
import { addItem } from './api/cart-adapter';
```

**Why:** Enables mocking in tests without module-level mock gymnastics. Makes it trivial to swap from mock adapters (localStorage) to real adapters (fetch) without changing component code.

### 2. Server is Authoritative

The frontend never calculates totals, stock, or prices. It uses whatever the backend returns.

```
CartDTO from backend → display items with server prices
                     → compute subtotal from server line items
                     → never override with local calculation
```

**Why:** Prevents stale data bugs. If the backend changes a price or removes an out-of-stock item, the UI reflects it immediately on the next response.

### 3. Zod at the Network Boundary

Every adapter response passes through a Zod schema before reaching domain types.

```ts
const parsed = OrderResponseSchema.safeParse(data);
if (!parsed.success) throw new OrderError(502, 'Invalid response');
```

**Why:** Catches backend contract drift at runtime. A missing field or type mismatch becomes a clear error instead of a silent `undefined` propagating through the UI.

### 4. Submit Guarding Pattern

All mutation components (AddToCartButton, QuantityControl, CartItem remove) use the same pattern:

```tsx
const submittingRef = useRef(false);

const handleSubmit = async () => {
  if (submittingRef.current) return;  // prevent duplicate
  submittingRef.current = true;
  setStatus('submitting');
  try {
    const result = await adapter.mutate(...);
    onSuccess?.(result);
  } catch (err) {
    // revert optimistic state
    setError(mapError(err));
  } finally {
    submittingRef.current = false;
  }
};
```

**Why:** `useRef` prevents race conditions between rapid clicks. `useState` tracks UI feedback. The `finally` block ensures the guard always resets.

### 5. Error Recovery

Failed mutations restore the previous authoritative state:

```tsx
const handleQuantityChange = async (next: number) => {
  const previous = quantity;       // snapshot
  setQuantity(next);               // optimistic
  try {
    await updateQuantity(adapter, cartId, itemId, next);
  } catch {
    setQuantity(previous);         // revert on failure
    setError('Failed to update');
  }
};
```

**Why:** Users see immediate feedback (optimistic update), but the server remains the source of truth. A failure reverts to the last known-good state.

### 6. Co-located Tests

Tests live next to the code they test:

```
components/AddToCartButton.tsx
__tests__/AddToCartButton.test.tsx
```

**Why:** Easy to find, easy to delete with the feature, clear ownership.

## API Mapping

| Frontend Function | Backend Endpoint | Method |
|---|---|---|
| `fetchProducts()` | `GET /products` | GET |
| `searchProducts(name)` | `GET /products/search?name=` | GET |
| `CartAdapter.getCurrentCart()` | `GET /api/customer/cart` | GET |
| `CartAdapter.createCart()` | `POST /api/customer/cart` | POST |
| `CartAdapter.addItem(cartId, productId, qty)` | `POST /api/customer/cart/{cartId}/items` | POST |
| `updateQuantity(adapter, cartId, itemId, qty)` | `PATCH /api/customer/cart/{cartId}/items/{itemId}` | PATCH |
| `removeCartItem(adapter, cartId, itemId)` | `DELETE /api/customer/cart/{cartId}/items/{itemId}` | DELETE |
| `submitOrder(token, request)` | `POST /api/customer/checkout` | POST |

## Error Handling Model

All backend errors follow a consistent JSON shape:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation Failed",
  "path": "/products",
  "validationErrors": { "name": "Product name must not be blank" }
}
```

The frontend maps HTTP status codes to user actions:

| Status | User Experience | Client Action |
|---|---|---|
| 400 | Show validation message | Do not retry |
| 401 | Ask to sign in | Clear session |
| 403 | Permission denied | Do not retry |
| 404 | Resource missing | Navigate safely |
| 409 | Stock/state conflict | Refresh server data |
| 503 | Unavailable | Bounded retry |

## Test Strategy

| Test Type | What It Verifies | Mocks |
|---|---|---|
| Adapter tests | Request shape, error mapping, response parsing | `fetch` (via `vi.spyOn`) |
| Component tests | UI rendering, user interactions, state transitions | Adapter (via props) |
| Schema tests | Zod accepts/rejects backend payloads | None (pure validation) |

### Running Tests

```bash
npm test           # run all once
npm run test:watch  # watch mode
npm run lint        # eslint
npm run type-check  # tsc --noEmit
```
