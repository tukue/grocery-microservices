import { describe, expect, it } from "vitest";

import { toProduct } from "./product.mapper";

describe("toProduct", () => {
  it("maps a valid product response", () => {
    expect(
      toProduct({
        available: true,
        currency: "SEK",
        description: "Crisp apples.",
        id: 1,
        imageUrl: "https://images.example.test/apples.jpg",
        name: "Apples",
        price: 29.9,
      }),
    ).toEqual({
        available: true,
        currency: "SEK",
        description: "Crisp apples.",
      id: 1,
      imageUrl: "https://images.example.test/apples.jpg",
      name: "Apples",
      price: 29.9,
    });
  });

  it("rejects a response with a missing required field", () => {
    expect(() => toProduct({ available: true, currency: "SEK", description: "Crisp apples.", id: 1, price: 29.9 })).toThrow();
  });

  it("rejects an invalid price", () => {
    expect(() =>
      toProduct({ available: true, currency: "SEK", description: "Crisp apples.", id: 1, name: "Apples", price: 0 }),
    ).toThrow();
  });

  it("maps an unavailable product without hiding it", () => {
    expect(
      toProduct({ available: false, currency: "SEK", description: "Crisp apples.", id: 1, name: "Apples", price: 29.9 }),
    ).toMatchObject({ available: false, id: 1 });
  });
});
