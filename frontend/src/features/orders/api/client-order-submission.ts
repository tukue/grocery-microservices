"use client";

import { createApplicationError } from "@/shared/errors/application-error";

import type { Order } from "../domain/order";
import { toOrder } from "./order.mappers";
import { checkoutRequestSchema, orderResponseSchema } from "./order.schemas";

function errorForStatus(status: number) {
  if (status === 400 || status === 422) {
    return createApplicationError("validation");
  }
  if (status === 401 || status === 403) {
    return createApplicationError("unauthorized");
  }
  if (status === 404) {
    return createApplicationError("not-found");
  }
  if (status >= 500) {
    return createApplicationError("service-unavailable");
  }

  return createApplicationError("unexpected");
}

export async function submitOrderFromClient(input: unknown): Promise<Order> {
  const request = checkoutRequestSchema.parse(input);

  try {
    const response = await fetch("/api/orders/checkout", {
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw errorForStatus(response.status);
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
