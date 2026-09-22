# Frontend Cart Experience — Plan (tasks 29–36)

Status: approved (implementation in progress)
Branch: feature/frontend-product-cart-foundation

## Scope
- 29 Connect product card to cart
- 30 CartItem component
- 31 CartSummary component
- 32 Cart page (route)
- 33 Quantity-update API adapter
- 34 QuantityControl component
- 35 Remove-item API adapter
- 36 Remove-item action (in CartItem)

Already implemented, NOT repeated: tasks 37–39 (order transport schemas,
Order domain, order-submission adapter + tests), cart domain + add-to-cart
action/button, products browsing.

## Contract facts (source of truth: docs/frontend-cart-api.md, merged backend)
- GET /api/customer/cart -> { id, status, items[{id, productId, productName, price, quantity}] }
- PATCH /api/customer/cart/{cartId}/items/{itemId} body { quantity >= 1 }
- DELETE /api/customer/cart/{cartId}/items/{itemId}
- No subtotal / currency / lineTotal in cart response (lineTotal only in order API,
  currency only in product API).

## Design decisions (user-approved)
1. CartSummary money: model optional `subtotal` / `currency` on cart transport+domain;
   page renders CartSummary ONLY when the backend supplies them. Never client-computed.
2. Navigation: add a "Cart" link on the products page header. Keep Storefront demo untouched.

## One-time setup
- Checkout feature/frontend-product-cart-foundation in the main checkout
  (external worktree already pruned).
- Copy frontend/node_modules from the orphaned worktree dir.
- Baseline: npm run lint && npm run type-check && npm test (all green).

## Feature-by-feature inventory
29: product-card.tsx renders <AddToCartButton productId available /> only;
    product-card.test.tsx asserts button + disabled unavailable state.
30: features/cart/components/cart-item.tsx (name, quantity, unit price,
    lineTotal? shown only when provided) + cart-item.test.tsx.
31: features/cart/components/cart-summary.tsx (subtotal, currency via Price,
    never computes) + cart-summary.test.tsx.
32: cart.schemas.ts optional subtotal/currency; domain + mapper pass-through;
    app/cart/page.tsx (server, force-dynamic; cookie->bearer->getCurrentCart;
    items, summary-if-supplied, empty state, signed-out state, link back to
    products; loading.tsx); Cart link on products page header;
    app/cart/page.test.tsx (mock next/headers + cart.server).
33: cart.schemas.ts quantity schema (int().positive()); cart-api.ts
    updateQuantity() parses before request -> PATCH; cart-api.test.ts:
    success, validation (no request on <=0), service failure.
34: api/update-quantity.action.ts (server action, revalidatePath('/cart')) +
    cart.server setCartItemQuantity; components/quantity-control.tsx (client:
    positive int, disabled while saving, validation + request errors, restores
    authoritative quantity on failure, router.refresh on success; injectable) +
    quantity-control.test.tsx.
35: cart-api.ts removeItem() -> DELETE; cart-api.test.ts: success, missing item
    (not-found preserved), service failure.
36: api/remove-item.action.ts + cart.server removeCartItem (revalidatePath);
    CartItem gains optional cartId/removeAction -> accessible remove button
    (disabled while submitting, duplicate guard, role=alert feedback,
    router.refresh on success); wire cart page; cart-item.test.tsx interaction tests.

## Verification per feature (basic generic tests)
- npm run lint && npm run type-check && npm test  (frontend)
- npm run build once before first push (dummy CART_SERVICE_URL /
  ORDER_SERVICE_URL / PRODUCT_SERVICE_URL)

## CI note
- Full CI (frontend-ci, maven matrix, docker smoke) runs on GitHub per push.
  Java matrix + smoke NOT run locally per feature (frontend-only changes).
  Full local CI replication available on request for a merge/push.

## Commit & push
- One focused commit per feature (grouping allowed on request).
- Push to origin/feature/frontend-product-cart-foundation after each green feature;
  GitHub Actions runs the full suite.