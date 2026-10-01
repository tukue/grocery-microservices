import { createApplicationError } from "@/shared/errors/application-error";

import type { Order } from "../domain/order";
import { toOrder } from "./order.mappers";
import { checkoutRequestSchema, orderResponseSchema } from "./order.schemas";
import { checkoutErrorForStatus } from "./checkout-errors";

export async function submitOrderFromClient(input: unknown): Promise<Order> {
  const request = checkoutRequestSchema.parse(input);

  try {
    // The BFF dynamic proxy resolves /api/customer/* to the owning service,
    // so this hits order-service POST /api/customer/checkout (same path the
    // server adapter uses). Do not use /api/orders/*: it falls through to the
    // product service.
    const response = await fetch("/api/customer/checkout", {
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw checkoutErrorForStatus(response.status);
    }

    const payload: unknown = await response.json();
    const parsedResponse = orderResponseSchema.safeParse(payload);
    if (!parsedResponse.success) {
      throw createApplicationError("unexpected");
    }

    return toOrder(parsedResponse.data);
  } catch (error) {
    if (error instanceof Error && error.name === "ApplicationError") {
      throw error;
    }
    throw createApplicationError("service-unavailable");
  }
}
