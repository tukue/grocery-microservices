import { describe, expect, it } from "vitest";
import { parseCart } from "./cart-schemas";

const sampleCart = {
  id: 1,
  items: [
    { id: 10, productName: "Apples", price: 1.5, quantity: 2 },
    { id: 11, productName: "Bread", price: 2.0, quantity: 1 },
  ],
};

describe("cart-schemas", () => {
  it("accepts a valid cart payload", () => {
    const parsed = parseCart(sampleCart);
    expect(parsed.id).toBe(1);
    expect(parsed.items).toHaveLength(2);
  });

  it("accepts carts with null ids and empty items", () => {
    expect(parseCart({ id: null, items: [] }).items).toEqual([]);
  });

  it("rejects items with blank names or negative quantities", () => {
    expect(() =>
      parseCart({ id: 1, items: [{ id: 1, productName: "", price: 1, quantity: 1 }] }),
    ).toThrow();
    expect(() =>
      parseCart({ id: 1, items: [{ id: 1, productName: "Milk", price: 1, quantity: -1 }] }),
    ).toThrow();
  });

  it("rejects negative prices", () => {
    expect(() =>
      parseCart({ id: 1, items: [{ id: 1, productName: "Milk", price: -0.5, quantity: 1 }] }),
    ).toThrow();
  });
});
