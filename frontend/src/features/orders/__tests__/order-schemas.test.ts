import { describe, it, expect } from 'vitest';
import {
  checkoutRequestSchema,
  orderResponseSchema,
  ordersListResponseSchema,
  orderStatusSchema,
} from '../api/order.schemas';

describe('order schemas', () => {
  describe('checkoutRequestSchema', () => {
    it('accepts valid checkout request', () => {
      const result = checkoutRequestSchema.safeParse({ cartId: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts checkout request with idempotency key', () => {
      const result = checkoutRequestSchema.safeParse({ cartId: 1, idempotencyKey: 'abc-123' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.idempotencyKey).toBe('abc-123');
    });

    it('rejects missing cartId', () => {
      expect(checkoutRequestSchema.safeParse({}).success).toBe(false);
    });

    it('rejects zero cartId', () => {
      expect(checkoutRequestSchema.safeParse({ cartId: 0 }).success).toBe(false);
    });

    it('rejects negative cartId', () => {
      expect(checkoutRequestSchema.safeParse({ cartId: -1 }).success).toBe(false);
    });

    it('rejects idempotency key over 64 chars', () => {
      const longKey = 'a'.repeat(65);
      expect(checkoutRequestSchema.safeParse({ cartId: 1, idempotencyKey: longKey }).success).toBe(false);
    });
  });

  describe('orderStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(orderStatusSchema.safeParse('PENDING').success).toBe(true);
      expect(orderStatusSchema.safeParse('COMPLETED').success).toBe(true);
      expect(orderStatusSchema.safeParse('CANCELLED').success).toBe(true);
    });

    it('rejects invalid status', () => {
      expect(orderStatusSchema.safeParse('SHIPPED').success).toBe(false);
    });
  });

  describe('orderResponseSchema', () => {
    const validOrder = {
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

    it('accepts valid order response', () => {
      expect(orderResponseSchema.safeParse(validOrder).success).toBe(true);
    });

    it('accepts order with empty order lines', () => {
      expect(orderResponseSchema.safeParse({ ...validOrder, orderLines: [] }).success).toBe(true);
    });

    it('rejects missing required fields', () => {
      expect(orderResponseSchema.safeParse({ id: 1 }).success).toBe(false);
    });
  });

  describe('ordersListResponseSchema', () => {
    it('accepts array of orders', () => {
      const orders = [
        { id: 1, userId: 'u', status: 'PENDING', orderDate: '2026-01-15T10:30:00', total: 10, cartId: 1, orderLines: [] },
        { id: 2, userId: 'u', status: 'COMPLETED', orderDate: '2026-01-16T10:30:00', total: 20, cartId: 2, orderLines: [] },
      ];
      expect(ordersListResponseSchema.safeParse(orders).success).toBe(true);
    });

    it('accepts empty array', () => {
      expect(ordersListResponseSchema.safeParse([]).success).toBe(true);
    });
  });
});
