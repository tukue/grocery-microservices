import { describe, it, expect } from 'vitest';
import type { Order, OrderConfirmation, OrderLine, OrderStatus } from '../types/order';

describe('Order domain model', () => {
  it('constructs a valid Order', () => {
    const order: Order = {
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
    expect(order.id).toBe(1);
    expect(order.orderLines).toHaveLength(1);
    expect(order.status).toBe('PENDING');
  });

  it('constructs a valid OrderConfirmation', () => {
    const confirmation: OrderConfirmation = {
      orderId: 1,
      status: 'PENDING',
      total: 25.5,
      orderDate: '2026-01-15T10:30:00',
      cartId: 10,
    };
    expect(confirmation.orderId).toBe(1);
    expect(confirmation.status).toBe('PENDING');
  });

  it(' OrderStatus accepts all valid values', () => {
    const pending: OrderStatus = 'PENDING';
    const completed: OrderStatus = 'COMPLETED';
    const cancelled: OrderStatus = 'CANCELLED';
    expect([pending, completed, cancelled]).toEqual(['PENDING', 'COMPLETED', 'CANCELLED']);
  });

  it('OrderLine has required fields', () => {
    const line: OrderLine = {
      productId: 42,
      productName: 'Apple',
      unitPrice: 2.5,
      quantity: 3,
      lineTotal: 7.5,
    };
    expect(line.productId + line.quantity).toBeGreaterThan(0);
  });

  it('Order supports empty orderLines', () => {
    const order: Order = {
      id: 1,
      userId: 'user-1',
      status: 'PENDING',
      orderDate: '2026-01-15T10:30:00',
      total: 0,
      cartId: 10,
      orderLines: [],
    };
    expect(order.orderLines).toEqual([]);
  });
});
