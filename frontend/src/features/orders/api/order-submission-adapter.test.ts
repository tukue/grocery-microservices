import { describe, expect, it, vi } from "vitest";

import { submitOrder } from "./order-submission-adapter";

const orderResponse = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [],
  status: "PENDING" as const,
  total: 29.9,
  userId: "customer-123",
};

describe("submitOrder", () => {
  it("sends only the documented checkout request fields and maps the backend ID", async () => {
    const request = vi.fn().mockResolvedValue(orderResponse);

    await expect(
      submitOrder({ request }, { cartId: 42, idempotencyKey: "checkout-42" }),
    ).resolves.toMatchObject({ id: 101 });
    expect(request).toHaveBeenCalledWith({
      body: { cartId: 42, idempotencyKey: "checkout-42" },
      correlationId: undefined,
      method: "POST",
      path: "/api/customer/checkout",
    });
  });

  it("rejects invalid backend responses", async () => {
    await expect(
      submitOrder(
        { request: vi.fn().mockResolvedValue({ id: "local" }) },
        { cartId: 42 },
      ),
    ).rejects.toMatchObject({ kind: "unexpected" });
  });
});
