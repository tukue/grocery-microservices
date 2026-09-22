import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProduct, listProducts, ProductApiError } from "./product-client";

function mockFetchOnce(jsonBody: unknown, { ok = true, status = 200 } = {}) {
  const calls: Array<{ input: unknown }> = [];
  const fetchMock = vi.fn(async (input: unknown) => {
    calls.push({ input });
    return { ok, status, json: async () => jsonBody };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("window", {
    localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
  });
});

describe("product-client", () => {
  it("listProducts() fetches /api/products", async () => {
    const { calls } = mockFetchOnce([{ id: 2, name: "Apples", price: 2.5 }]);
    const products = await listProducts();
    expect(calls[0].input).toBe("/api/products");
    expect(products).toHaveLength(1);
  });

  it("getProduct() fetches one product", async () => {
    mockFetchOnce({ id: 2, name: "Apples", price: 2.5 });
    const product = await getProduct(2);
    expect(product.name).toBe("Apples");
  });

  it("maps 404 to 'Product not found.'", async () => {
    mockFetchOnce("Product not found", { ok: false, status: 404 });
    await expect(getProduct(99)).rejects.toThrowError("Product not found.");
  });

  it("throws ProductApiError on malformed payloads", async () => {
    mockFetchOnce([{ id: 2, name: "", price: 0 }]);
    await expect(listProducts()).rejects.toBeInstanceOf(ProductApiError);
  });
});
