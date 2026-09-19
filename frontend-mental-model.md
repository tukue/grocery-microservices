# Frontend Mental Model — One Page

## Core Principle

**Components decide what to render. Adapters decide how to communicate. Schemas decide what's valid. The server decides what's true.**

---

## Four Layers

```
┌──────────────────────────────────────────────────────┐
│  UI LAYER — React Components                         │
│  ProductCard, CartItem, QuantityControl, CartPage     │
│  Owns: loading state, error state, user interactions │
│  Receives: adapter via props (dependency injection)  │
└──────────────────────┬───────────────────────────────┘
                       │ calls
┌──────────────────────▼───────────────────────────────┐
│  ADAPTER LAYER — Typed fetch wrappers                │
│  cart-adapter, order-adapter, product-adapter        │
│  Owns: HTTP calls, auth headers, error mapping       │
│  Returns: validated domain types                     │
└──────────────────────┬───────────────────────────────┘
                       │ validates with
┌──────────────────────▼───────────────────────────────┐
│  SCHEMA LAYER — Zod                                  │
│  order-schemas.ts                                    │
│  Owns: JSON shape validation at network boundary     │
│  Rejects: unexpected backend responses               │
└──────────────────────┬───────────────────────────────┘
                       │ maps to
┌──────────────────────▼───────────────────────────────┐
│  DOMAIN LAYER — Plain TypeScript types               │
│  Order, OrderLine, OrderConfirmation, CartDTO        │
│  Owns: business vocabulary                           │
│  Depends on: nothing (framework-free)                │
└──────────────────────────────────────────────────────┘
```

---

## Five Rules

| # | Rule | What breaks without it |
|---|------|----------------------|
| 1 | **Adapter via props** | Untestable components, module mock hacks |
| 2 | **Server is authoritative** | Price/stock drift between UI and backend |
| 3 | **Zod at the boundary** | Silent `undefined` propagation from bad JSON |
| 4 | **Submit guard with ref** | Duplicate orders on double-click |
| 5 | **Revert on failure** | Optimistic UI that lies about server state |

---

## Data Flow — Add to Cart

```
Click "Add to Cart"
       │
       ▼
  adapter.getCurrentCart()       GET /api/customer/cart
       │
       ├─ null → adapter.createCart()   POST /api/customer/cart
       │
       ▼
  adapter.addItem(cartId, productId, 1)  POST /api/customer/cart/{id}/items
       │
       ▼
  CartDTO (server says what cart looks like now)
       │
       ▼
  onCartUpdated → parent re-renders with server data
```

---

## Error Flow

```
Server returns error
       │
       ▼
  Adapter maps status to meaning
  400 → validation    409 → conflict
  401 → auth          503 → retryable
       │
       ▼
  Component shows user-friendly message
  Failed mutation reverts to previous state
```

---

## Test Strategy

```
Schema tests  →  Does Zod accept/reject this JSON?
Adapter tests →  Does this function call the right URL with the right shape?
Component tests → Does this button disable while saving? Does error show?
```

**Each layer mocks the one below it. No tests hit a real network.**

---

## File Map

```
features/
  cart/
    api/              adapters (fetch wrappers)
    components/       UI (React)
    __tests__/        tests (Vitest + testing-library)
  products/
    api/              adapters
    components/       UI
    __tests__/        tests
  orders/
    api/              adapters + Zod schemas
    types/            domain models
    __tests__/        tests
```

**One feature = one directory = adapters + components + tests colocated.**
