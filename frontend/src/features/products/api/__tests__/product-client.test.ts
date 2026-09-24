import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchProduct,
  fetchProducts,
  searchProducts,
} from "../product-adapter";

const productDto = {
  id: 7,
  name: "Apples",
  description: "Crisp apples.",
  price: 2.5,
  currency: "SEK",
  available: true,
  stockQuantity: 12,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProducts", () => {
  it("requests the catalogue list endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([productDto])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProducts()).resolves.toEqual([
      { ...productDto, imageUrl: undefined },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products");
  });

  it("throws a safe error when the service is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );

    await expect(fetchProducts()).rejects.toThrow("Unable to load products");
  });

  it("throws a safe error when the payload is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "x" }]))),
    );

    await expect(fetchProducts()).rejects.toThrow(
      "Unable to read product data",
    );
  });
});

describe("searchProducts", () => {
  it("encodes the search term on the query string", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([productDto])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchProducts("apple & pear")).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/products/search?name=apple%20%26%20pear",
    );
  });

  it("throws a safe error when no matches can be parsed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 500 })),
    );

    await expect(searchProducts("zzz")).rejects.toThrow(
      "Unable to load products",
    );
  });
});

describe("fetchProduct", () => {
  it("requests a single product by id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(productDto)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProduct(7)).resolves.toMatchObject({ name: "Apples" });
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products/7");
  });

  it("maps 404 responses to a not-found message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );

    await expect(fetchProduct(99)).rejects.toThrow("Product not found");
  });

  it("maps other failures to a generic load error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("boom", { status: 500 })),
    );

    await expect(fetchProduct(7)).rejects.toThrow("Unable to load product");
  });

  it("throws a safe error when the payload is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "x" }))),
    );

    await expect(fetchProduct(7)).rejects.toThrow(
      "Unable to read product data",
    );
  });
});
