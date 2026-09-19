import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitOrder, OrderError } from '../api/order-adapter';

const mockOrderResponse = {
  id: 1,
  userId: 'user-1',
  status: 'PENDING',
  orderDate: '2026-01-15T10:30:00',
  total: 25.5,
  cartId: 10,
  orderLines: [
    { productId: 42, productName: 'Apple', unitPrice: 2.5, quantity: 3, lineTotal: 7.5 },
  ],
};

describe('submitOrder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns OrderConfirmation on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockOrderResponse), { status: 201 }),
    );

    const result = await submitOrder('token-123', { cartId: 10 });
    expect(result).toEqual({
      orderId: 1,
      status: 'PENDING',
      total: 25.5,
      orderDate: '2026-01-15T10:30:00',
      cartId: 10,
    });
  });

  it('sends correct request shape', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockOrderResponse), { status: 201 }),
    );

    await submitOrder('token-123', { cartId: 10, idempotencyKey: 'key-abc' });

    expect(fetchSpy).toHaveBeenCalledWith('/api/customer/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({ cartId: 10, idempotencyKey: 'key-abc' }),
    });
  });

  it('throws OrderError on service failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Cart is empty' }), { status: 400 }),
    );

    await expect(submitOrder('token-123', { cartId: 10 })).rejects.toThrow(OrderError);
    await expect(submitOrder('token-123', { cartId: 10 })).rejects.toMatchObject({ status: 400 });
  });

  it('throws OrderError on 503 service unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    await expect(submitOrder('token-123', { cartId: 10 })).rejects.toThrow(OrderError);
  });

  it('throws OrderError on invalid response schema', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ invalid: 'data' }), { status: 201 }),
    );

    try {
      await submitOrder('token-123', { cartId: 10 });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OrderError);
      expect((err as OrderError).status).toBe(502);
    }
  });

  it('throws OrderError on 409 conflict', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Cart already checked out' }), { status: 409 }),
    );

    await expect(submitOrder('token-123', { cartId: 10 })).rejects.toMatchObject({ status: 409 });
  });
});
