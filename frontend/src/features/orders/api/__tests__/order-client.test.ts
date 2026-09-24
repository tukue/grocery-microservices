import { afterEach, describe, expect, it, vi } from "vitest";

import { OrderError } from "../order-adapter";
import { fetchOrder, fetchOrders } from "../order-client";

const orderDto = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [
    {
      lineTotal: 59.8,
      productId: 12,
      productName: "Apples",
      quantity: 2,
      unitPrice: 29.9,
    },
  ],
  status: "PENDING",
  total: 59.8,
  userId: "customer-123",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOrder", () => {
  it("requests the order by id and returns a validated domain order", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(orderDto), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOrder(101)).resolves.toEqual({
      cartId: 42,
      id: 101,
      orderDate: "2026-09-17T14:45:00",
      orderLines: orderDto.orderLines,
      status: "PENDING",
      total: 59.8,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/customer/orders/101");
  });

  it("throws OrderError with the backend status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Order not found" }), {
          status: 404,
        }),
      ),
    );

    await expect(fetchOrder(999)).rejects.toMatchObject({
      name: "OrderError",
      status: 404,
      message: "Order not found",
    });
  });

  it("throws OrderError 502 on an invalid payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "x" }))),
    );

    await expect(fetchOrder(1)).rejects.toEqual(
      new OrderError(502, "Invalid response from server"),
    );
  });
});

describe("fetchOrders", () => {
  it("requests the customer order list and returns domain orders", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([orderDto]), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const orders = await fetchOrders();
    expect(fetchMock).toHaveBeenCalledWith("/api/customer/orders");
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ id: 101, total: 59.8 });
  });

  it("throws OrderError on unauthorized access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(fetchOrders()).rejects.toMatchObject({
      name: "OrderError",
      status: 403,
    });
  });

  it("throws OrderError 502 when the list payload is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ not: "a list" }))),
    );

    await expect(fetchOrders()).rejects.toMatchObject({
      name: "OrderError",
      status: 502,
    });
  });
});
