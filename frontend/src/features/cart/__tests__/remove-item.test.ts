import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeCartItem } from '../api/remove-item';
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

const mockCart: CartDTO = { id: 1, status: 'OPEN', items: [] };

describe('removeCartItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls adapter.removeItem and returns updated cart', async () => {
    const adapter = createMockAdapter({ removeItem: vi.fn().mockResolvedValue(mockCart) });
    const result = await removeCartItem(adapter, 1, 10);
    expect(adapter.removeItem).toHaveBeenCalledWith(1, 10);
    expect(result).toBe(mockCart);
  });

  it('propagates 404 when item not found', async () => {
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockRejectedValue({ status: 404, message: 'Item not found' }),
    });
    await expect(removeCartItem(adapter, 1, 999)).rejects.toMatchObject({ status: 404 });
  });

  it('propagates service failure errors', async () => {
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockRejectedValue({ status: 503, message: 'Service unavailable' }),
    });
    await expect(removeCartItem(adapter, 1, 10)).rejects.toMatchObject({ status: 503 });
  });

  it('propagates 403 forbidden errors', async () => {
    const adapter = createMockAdapter({
      removeItem: vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' }),
    });
    await expect(removeCartItem(adapter, 1, 10)).rejects.toMatchObject({ status: 403 });
  });
});
