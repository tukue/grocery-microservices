import { afterEach, describe, expect, it, vi } from "vitest";

import { CartAdapter } from "../cart-adapter";

const cartDto = {
  id: 7,
  status: "OPEN",
  items: [
    {
      id: 10,
      productId: 42,
      productName: "Apples",
      price: 2.5,
      quantity: 2,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CartAdapter", () => {
  describe("getCurrentCart", () => {
    it("requests the customer cart and returns the payload", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(cartDto)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(new CartAdapter("token").getCurrentCart()).resolves.toEqual(
        cartDto,
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customer/cart",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        }),
      );
    });

    it("returns null when the customer has no cart yet", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
      );

      await expect(new CartAdapter().getCurrentCart()).resolves.toBeNull();
    });

    it("throws the API error for non-404 failures", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              timestamp: "2026-09-23T00:00:00Z",
              status: 503,
              error: "Service Unavailable",
              message: "Cart service unavailable",
            }),
            { status: 503 },
          ),
        ),
      );

      await expect(new CartAdapter().getCurrentCart()).rejects.toMatchObject({
        status: 503,
        message: "Cart service unavailable",
      });
    });
  });

  describe("createCart", () => {
    it("posts to the cart collection", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(cartDto)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(new CartAdapter().createCart()).resolves.toEqual(cartDto);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customer/cart",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("addItem", () => {
    it("posts the line item to the cart", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(cartDto)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(new CartAdapter().addItem(7, 42, 2)).resolves.toEqual(
        cartDto,
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customer/cart/7/items",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ productId: 42, quantity: 2 }),
        }),
      );
    });

    it("surfaces conflict failures for unavailable items", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              timestamp: "2026-09-23T00:00:00Z",
              status: 409,
              error: "Conflict",
              message: "Insufficient stock",
            }),
            { status: 409 },
          ),
        ),
      );

      await expect(new CartAdapter().addItem(7, 42, 2)).rejects.toMatchObject({
        status: 409,
        message: "Insufficient stock",
      });
    });
  });

  describe("updateItemQuantity", () => {
    it("patches the line quantity", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(cartDto)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        new CartAdapter().updateItemQuantity(7, 10, 5),
      ).resolves.toEqual(cartDto);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customer/cart/7/items/10",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ quantity: 5 }),
        }),
      );
    });
  });

  describe("removeItem", () => {
    it("deletes the line item", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(cartDto)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(new CartAdapter().removeItem(7, 10)).resolves.toEqual(
        cartDto,
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customer/cart/7/items/10",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
