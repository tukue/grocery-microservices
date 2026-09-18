import { afterEach, describe, expect, it, vi } from "vitest";

import { submitOrderFromClient } from "./client-order-submission";

const orderResponse = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [],
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

    await expect(submitOrderFromClient({ cartId: 42 })).resolves.toMatchObject({
      id: 101,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/orders/checkout", {
      body: JSON.stringify({ cartId: 42 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
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
