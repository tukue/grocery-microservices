import { notifySessionExpired } from "../../../shared/http/session-expired";
import { cartResponseSchema, type CartResponse } from "./cart.schemas";

const BASE = "/api/customer";
export class CartClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function request(
  path: string,
  init?: RequestInit,
): Promise<CartResponse> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  notifySessionExpired(response.status);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new CartClientError(
      body?.message ?? `Cart request failed (${response.status})`,
      response.status,
    );
  }
  return cartResponseSchema.parse(await response.json());
}
export class CartClient {
  async getCurrentCart(): Promise<CartResponse | null> {
    try {
      return await request("/cart");
    } catch (error) {
      if (error instanceof CartClientError && error.status === 404) return null;
      throw error;
    }
  }
  createCart(): Promise<CartResponse> {
    return request("/cart", { method: "POST" });
  }
  addItem(
    cartId: number,
    productId: number,
    quantity: number,
  ): Promise<CartResponse> {
    return request(`/cart/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
  }
  updateItemQuantity(
    cartId: number,
    itemId: number,
    quantity: number,
  ): Promise<CartResponse> {
    return request(`/cart/${cartId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }
  removeItem(cartId: number, itemId: number): Promise<CartResponse> {
    return request(`/cart/${cartId}/items/${itemId}`, { method: "DELETE" });
  }
}
