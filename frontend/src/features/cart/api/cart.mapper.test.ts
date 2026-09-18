import { describe, expect, it } from "vitest";
import { toCart } from "./cart.mapper";

const item = { id: 7, price: 29.9, productId: 12, productName: "Apples", quantity: 2 };

describe("toCart", () => {
  it("maps a normal cart", () => expect(toCart({ id: 42, items: [item], status: "OPEN" })).toMatchObject({ id: 42, items: [item] }));
  it("maps an empty cart", () => expect(toCart({ id: 42, items: [], status: "OPEN" }).items).toEqual([]));
  it("rejects an invalid quantity", () => expect(() => toCart({ id: 42, items: [{ ...item, quantity: 0 }], status: "OPEN" })).toThrow());
  it("rejects an invalid monetary value", () => expect(() => toCart({ id: 42, items: [{ ...item, price: -1 }], status: "OPEN" })).toThrow());
});
