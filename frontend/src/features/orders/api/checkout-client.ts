import { notifySessionExpired } from "../../../shared/http/session-expired";
import {
  ApplicationError,
  createApplicationError,
} from "@/shared/errors/application-error";
import { checkoutErrorForStatus } from "./checkout-errors";
import {
  checkoutRequestSchema,
  orderResponseSchema,
  type OrderResponseDto,
} from "./order.schemas";

export async function submitCheckout(
  input: unknown,
): Promise<OrderResponseDto> {
  const request = checkoutRequestSchema.parse(input);
  if (!request.idempotencyKey)
    throw createApplicationError(
      "validation",
      undefined,
      "Checkout retry key is required.",
    );
  try {
    const response = await fetch("/api/customer/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    notifySessionExpired(response.status);
    if (!response.ok) throw checkoutErrorForStatus(response.status);
    return orderResponseSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw createApplicationError("service-unavailable");
  }
}
