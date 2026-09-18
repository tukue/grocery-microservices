import "server-only";

import { serverEnv } from "@/shared/config/server-env";
import { createServerHttpClient } from "@/shared/http/server-http-client";

import type { Order } from "../domain/order";
import { submitOrder } from "./order-submission-adapter";

export async function submitOrderOnServer(
  input: unknown,
  requestHeaders: Headers,
): Promise<Order> {
  const client = createServerHttpClient({
    baseUrl: serverEnv.ORDER_SERVICE_URL,
  });
  const authorization = requestHeaders.get("authorization");
  const correlationId = requestHeaders.get("x-correlation-id") ?? undefined;

  return submitOrder(
    {
      request: (request) =>
        client.request({
          ...request,
          headers: authorization ? { authorization } : undefined,
        }),
    },
    input,
    correlationId,
  );
}
