import { createApplicationError } from "@/shared/errors/application-error";

import type { Order } from "../domain/order";
import { toOrder } from "./order.mappers";
import { checkoutRequestSchema, orderResponseSchema } from "./order.schemas";

export type OrderSubmissionTransport = Readonly<{
  request<TResponse>(request: {
    body: unknown;
    correlationId?: string;
    headers?: HeadersInit;
    method: "POST";
    path: string;
  }): Promise<TResponse>;
}>;

export async function submitOrder(
  transport: OrderSubmissionTransport,
  input: unknown,
  correlationId?: string,
): Promise<Order> {
  const request = checkoutRequestSchema.parse(input);
  const response = await transport.request<unknown>({
    body: request,
    correlationId,
    method: "POST",
    path: "/api/customer/checkout",
  });
  const parsedResponse = orderResponseSchema.safeParse(response);

  if (!parsedResponse.success) {
    throw createApplicationError("unexpected");
  }

  return toOrder(parsedResponse.data);
}
