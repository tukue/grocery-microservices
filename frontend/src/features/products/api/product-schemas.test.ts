import { describe, expect, it } from "vitest";
import { parseProduct, parseProductList } from "./product-schemas";

describe("product-schemas", () => {
  it("accepts a valid product and product list", () => {
    expect(parseProduct({ id: 2, name: "Apples", price: 2.5 }).name).toBe("Apples");
    expect(parseProductList([{ id: 2, name: "Apples", price: 2.5 }])).toHaveLength(1);
  });

  it("rejects blank names and non-positive prices", () => {
    expect(() => parseProduct({ id: 2, name: "  ", price: 2.5 })).toThrow();
    expect(() => parseProduct({ id: 2, name: "Apples", price: 0 })).toThrow();
  });
});
