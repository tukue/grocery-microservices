import type { CartAdapter, CartDTO } from './cart-adapter';

export class QuantityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantityValidationError';
  }
}

export async function updateQuantity(
  adapter: CartAdapter,
  cartId: number,
  itemId: number,
  quantity: number,
): Promise<CartDTO> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new QuantityValidationError('Quantity must be a positive integer');
  }
  return adapter.updateItemQuantity(cartId, itemId, quantity);
}
