import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addItem,
  CartApiError,
  createCart,
  getCart,
  getOrCreateCart,
  removeItem,
  updateItem,
} from "./cart-client";

const sampleCart = {
  id: 1,
  items: [{ id: 10, productName: "Apples", price: 1.5, quantity: 2 }],
};

function mockFetchOnce(jsonBody: unknown, { ok = true, status = 200 } = {}) {
  const calls: Array<{ input: unknown; init?: RequestInit }> = [];
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    calls.push({ input, init });
    return { ok, status, json: async () => jsonBody };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  vi.stubGlobal("window", { localStorage: storage });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("cart-client", () => {
  it("getCart() fetches the cart and derives totals", async () => {
    mockFetchOnce(sampleCart);
    stubStorage();
    const cart = await getCart(1);
    expect(cart.total).toBe(3.0);
    expect(cart.itemCount).toBe(2);
  });

  it("createCart() posts to /api/carts and stores the id", async () => {
    const { calls } = mockFetchOnce({ id: 7, items: [] });
    const store = stubStorage();
    const cart = await createCart();
    expect(calls[0].input).toBe("/api/carts");
    expect(cart.id).toBe(7);
    expect(store.get("grocery:cart-id")).toBe("7");
  });

  it("getOrCreateCart() reuses the stored cart id", async () => {
    const { calls } = mockFetchOnce(sampleCart);
    stubStorage({ "grocery:cart-id": "1" });
    const cart = await getOrCreateCart();
    expect(calls[0].input).toBe("/api/carts/1");
    expect(cart.id).toBe(1);
  });

  it("getOrCreateCart() creates a fresh cart when the stored one is gone", async () => {
    const gone = { ok: false, status: 404, json: async () => "Cart not found" };
    const created = { ok: true, status: 200, json: async () => ({ id: 9, items: [] }) };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(gone)
      .mockResolvedValueOnce(created);
    vi.stubGlobal("fetch", fetchMock);
    stubStorage({ "grocery:cart-id": "42" });
    const cart = await getOrCreateCart();
    expect(cart.id).toBe(9);
  });

  it("addItem() posts the new line to /api/carts/:id/items", async () => {
    const { calls } = mockFetchOnce(sampleCart);
    stubStorage();
    await addItem(1, { productName: "Apples", price: 1.5, quantity: 2 });
    expect(calls[0].input).toBe("/api/carts/1/items");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      productName: "Apples",
      price: 1.5,
      quantity: 2,
    });
  });

  it("updateItem() patches quantity", async () => {
    const { calls } = mockFetchOnce(sampleCart);
    stubStorage();
    await updateItem(1, 10, 5);
    expect(calls[0].input).toBe("/api/carts/1/items/10");
    expect(calls[0].init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ quantity: 5 });
  });

  it("removeItem() deletes the line", async () => {
    const { calls } = mockFetchOnce({ id: 1, items: [] });
    stubStorage();
    const cart = await removeItem(1, 10);
    expect(calls[0].input).toBe("/api/carts/1/items/10");
    expect(calls[0].init?.method).toBe("DELETE");
    expect(cart.items).toEqual([]);
  });

  it("maps 401 to a login message", async () => {
    mockFetchOnce({ error: "x" }, { ok: false, status: 401 });
    stubStorage();
    await expect(getCart(1)).rejects.toMatchObject({ status: 401 });
    await expect(getCart(1)).rejects.toThrowError(/log in/i);
  });

  it("surfaces backend validation messages on 400", async () => {
    mockFetchOnce({ quantity: "Quantity must be non-negative" }, { ok: false, status: 400 });
    stubStorage();
    await expect(updateItem(1, 10, -1)).rejects.toThrowError("Quantity must be non-negative");
  });

  it("throws CartApiError on malformed success payloads", async () => {
    mockFetchOnce({ id: 1, items: "nope" });
    stubStorage();
    await expect(getCart(1)).rejects.toBeInstanceOf(CartApiError);
  });
});
