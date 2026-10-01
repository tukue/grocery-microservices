import { afterEach, describe, expect, it, vi } from "vitest";

import { submitOrderFromClient } from "./client-order-submission";

const orderResponse = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [
    {
      productId: 1,
      productName: "Apple",
      unitPrice: 29.9,
      quantity: 1,
      lineTotal: 29.9,
    },
  ],
  status: "PENDING",
  total: 29.9,
  userId: "customer-123",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitOrderFromClient", () => {
  it("posts the documented request and returns the backend order ID", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(orderResponse), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitOrderFromClient({ cartId: 42, idempotencyKey: "checkout-42" }),
    ).resolves.toMatchObject({
      id: 101,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/customer/checkout", {
      body: JSON.stringify({ cartId: 42, idempotencyKey: "checkout-42" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it.each([
    [400, "Please check your cart items."],
    [401, "Session expired. Please sign in again."],
    [403, "You don't have permission for this cart."],
    [404, "Cart not found."],
    [409, "Cart was modified. Please review and try again."],
    [503, "Service temporarily unavailable. Please try again."],
  ])("maps HTTP %s to a checkout message", async (status, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status })),
    );

    await expect(
      submitOrderFromClient({ cartId: 42, idempotencyKey: "checkout-42" }),
    ).rejects.toMatchObject({ customerMessage: message });
  });

  it("normalizes invalid backend responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "local" }))),
    );

    await expect(submitOrderFromClient({ cartId: 42 })).rejects.toMatchObject({
      kind: "unexpected",
    });
  });
});
