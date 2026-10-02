import { describe, expect, it } from "vitest";
import { checkoutRequestSchema, orderResponseSchema } from "./order.schemas";
const order = {
  id: 1,
  userId: "u",
  cartId: 2,
  status: "PENDING",
  orderDate: "2026-09-30T10:00:00",
  total: 2,
  orderLines: [
    {
      productId: 3,
      productName: "Apple",
      unitPrice: 1,
      quantity: 2,
      lineTotal: 2,
    },
  ],
};
describe("order schemas", () => {
  it("accepts constrained checkout and order data", () => {
    expect(
      checkoutRequestSchema.parse({ cartId: 2, idempotencyKey: "key" }),
    ).toBeTruthy();
    expect(orderResponseSchema.parse(order)).toBeTruthy();
  });
  it.each([
    { ...order, id: 0 },
    { ...order, total: -1 },
    { ...order, orderLines: [] },
    { ...order, status: "UNKNOWN" },
  ])("rejects invalid order data", (value) =>
    expect(orderResponseSchema.safeParse(value).success).toBe(false),
  );
  it("enforces key length 1-64", () => {
    expect(
      checkoutRequestSchema.safeParse({ cartId: 1, idempotencyKey: "" })
        .success,
    ).toBe(false);
    expect(
      checkoutRequestSchema.safeParse({
        cartId: 1,
        idempotencyKey: "x".repeat(65),
      }).success,
    ).toBe(false);
  });
});
