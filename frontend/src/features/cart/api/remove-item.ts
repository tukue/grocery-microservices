import type { CartAdapter, CartDTO } from './cart-adapter';

export async function removeCartItem(
  adapter: CartAdapter,
  cartId: number,
  itemId: number,
): Promise<CartDTO> {
  return adapter.removeItem(cartId, itemId);
}
