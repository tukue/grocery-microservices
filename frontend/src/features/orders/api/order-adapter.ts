import { OrderResponseSchema, type CheckoutRequest, type OrderResponse } from './order-schemas';
import type { OrderConfirmation } from '../types/order';

const ORDER_BASE = '/api/customer';

export class OrderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
  }
}

export async function submitOrder(
  token: string,
  request: CheckoutRequest,
): Promise<OrderConfirmation> {
  const response = await fetch(`${ORDER_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new OrderError(response.status, body?.message ?? `Checkout failed with status ${response.status}`);
  }

  const data: OrderResponse = await response.json();
  const parsed = OrderResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new OrderError(502, 'Invalid response from server');
  }

  return {
    orderId: parsed.data.id,
    status: parsed.data.status,
    total: parsed.data.total,
    orderDate: parsed.data.orderDate,
    cartId: parsed.data.cartId,
  };
}
