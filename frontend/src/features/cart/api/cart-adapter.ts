import type { CartDTO, CartItemDTO } from "./cart-schemas";

/**
 * Adapter: normalizes server cart DTOs into UI-ready `Cart` objects.
 *
 * The backend stores no totals, so `total` and `itemCount` are derived
 * here from item prices — every consumer shares one derivation.
 */

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

/** Cart enriched with client-derived totals. */
export type Cart = CartDTO & {
  total: number;
  itemCount: number;
};

export function toCart(dto: CartDTO): Cart {
  const items: CartItemDTO[] = dto.items ?? [];
  const total = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { ...dto, items, total, itemCount };
}

/** Optimistically set one line's quantity (quantity 0 drops the line). */
export function withOptimisticQuantity(cart: Cart, itemId: number, quantity: number): Cart {
  const items = cart.items
    .map((item) => (item.id === itemId ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  return toCart({ ...cart, items });
}
