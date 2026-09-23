import type { Order } from "../domain/order";
import { OrderError } from "./order-adapter";
import { toOrder } from "./order.mappers";
import {
  orderResponseSchema,
  ordersListResponseSchema,
} from "./order.schemas";

const ORDER_BASE = "/api/customer";

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new OrderError(
      response.status,
      body?.message ?? `Order request failed with status ${response.status}`,
    );
  }
  return response.json();
}

export async function fetchOrder(id: number): Promise<Order> {
  const response = await fetch(`${ORDER_BASE}/orders/${id}`);
  const data = await readJson(response);
  const parsed = orderResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new OrderError(502, "Invalid response from server");
  }
  return toOrder(parsed.data);
}

export async function fetchOrders(): Promise<Order[]> {
  const response = await fetch(`${ORDER_BASE}/orders`);
  const data = await readJson(response);
  const parsed = ordersListResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new OrderError(502, "Invalid response from server");
  }
  return parsed.data.map(toOrder);
}
