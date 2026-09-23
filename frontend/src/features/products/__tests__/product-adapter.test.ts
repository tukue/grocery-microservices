import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchProduct, fetchProducts } from "../api/product-adapter";

describe("fetchProducts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the BFF catalog endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: "Apple",
              description: "Crisp apples.",
              price: 2.5,
              currency: "SEK",
              available: true,
              stockQuantity: 10,
            },
          ]),
        ),
      ),
    );

    await expect(fetchProducts()).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith("/api/catalog/products");
  });

  it("returns a safe error for malformed product responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));

    await expect(fetchProducts()).rejects.toThrow(
      "Unable to read product data",
    );
  });
});

describe("fetchProduct", () => {
  afterEach(() => vi.unstubAllGlobals());

  const product = {
    id: 7,
    name: "Apple",
    description: "Crisp apples.",
    price: 2.5,
    currency: "SEK",
    available: true,
    stockQuantity: 10,
  };

  it("uses the BFF catalog endpoint with the product id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(product))),
    );

    await expect(fetchProduct(7)).resolves.toMatchObject({ name: "Apple" });
    expect(fetch).toHaveBeenCalledWith("/api/catalog/products/7");
  });

  it("reports not found for unknown products", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );

    await expect(fetchProduct(99)).rejects.toThrow("Product not found");
  });

  it("returns a safe error for malformed product responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")));

    await expect(fetchProduct(7)).rejects.toThrow(
      "Unable to read product data",
    );
  });
});
