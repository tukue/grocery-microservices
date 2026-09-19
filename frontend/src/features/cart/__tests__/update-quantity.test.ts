import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateQuantity, QuantityValidationError } from '../api/update-quantity';
import type { CartAdapter, CartDTO } from '../api/cart-adapter';

function createMockAdapter(overrides: Partial<CartAdapter> = {}): CartAdapter {
  return {
    getCurrentCart: vi.fn(),
    createCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    ...overrides,
  } as unknown as CartAdapter;
}

const mockCart: CartDTO = { id: 1, status: 'OPEN', items: [{ id: 10, productId: 42, productName: 'Apple', price: 2.5, quantity: 5 }] };

describe('updateQuantity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls adapter.updateItemQuantity with valid quantity', async () => {
    const adapter = createMockAdapter({ updateItemQuantity: vi.fn().mockResolvedValue(mockCart) });
    const result = await updateQuantity(adapter, 1, 10, 5);
    expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 5);
    expect(result).toBe(mockCart);
  });

  it('rejects zero quantity', async () => {
    const adapter = createMockAdapter();
    await expect(updateQuantity(adapter, 1, 10, 0)).rejects.toThrow(QuantityValidationError);
    expect(adapter.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects negative quantity', async () => {
    const adapter = createMockAdapter();
    await expect(updateQuantity(adapter, 1, 10, -3)).rejects.toThrow(QuantityValidationError);
    expect(adapter.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('rejects non-integer quantity', async () => {
    const adapter = createMockAdapter();
    await expect(updateQuantity(adapter, 1, 10, 2.5)).rejects.toThrow(QuantityValidationError);
    expect(adapter.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('propagates service errors', async () => {
    const adapter = createMockAdapter({
      updateItemQuantity: vi.fn().mockRejectedValue({ status: 503, message: 'Service unavailable' }),
    });
    await expect(updateQuantity(adapter, 1, 10, 5)).rejects.toMatchObject({ status: 503 });
  });

  it('propagates 409 conflict errors', async () => {
    const adapter = createMockAdapter({
      updateItemQuantity: vi.fn().mockRejectedValue({ status: 409, message: 'Item not found' }),
    });
    await expect(updateQuantity(adapter, 1, 10, 5)).rejects.toMatchObject({ status: 409 });
  });
});
