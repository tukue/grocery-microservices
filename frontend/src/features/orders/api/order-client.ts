import { notifySessionExpired } from "../../../shared/http/session-expired";
import {
  orderResponseSchema,
  ordersListResponseSchema,
  type OrderResponseDto,
} from "./order.schemas";

export class OrderClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function request(path: string): Promise<unknown> {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
  });
  notifySessionExpired(response.status);
  if (!response.ok)
    throw new OrderClientError(
      response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
          ? "You do not have access to this order."
          : response.status === 404
            ? "Order not found"
            : "Unable to load orders",
      response.status,
    );
  return response.json();
}
export async function fetchOrder(id: number): Promise<OrderResponseDto> {
  if (!Number.isInteger(id) || id <= 0)
    throw new OrderClientError("Invalid order", 400);
  return orderResponseSchema.parse(await request(`/api/customer/orders/${id}`));
}
export async function fetchOrders(): Promise<OrderResponseDto[]> {
  return ordersListResponseSchema.parse(await request("/api/customer/orders"));
}
