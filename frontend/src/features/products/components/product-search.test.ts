import { describe, expect, it } from "vitest";

import { productsSearchPath } from "./product-search";

describe("productsSearchPath", () => {
  it("creates a URL query for a submitted search", () => {
    expect(productsSearchPath("fresh apples")).toBe("/products?search=fresh%20apples");
  });

  it("clears the query for an empty search", () => {
    expect(productsSearchPath("  ")).toBe("/products");
  });
});
