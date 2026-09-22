import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchProducts } from "../api/product-adapter";

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
