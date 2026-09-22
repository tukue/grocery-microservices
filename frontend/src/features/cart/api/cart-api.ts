import { authHeader } from "../../auth/api/auth-client";
import { parseCart, type CartDTO } from "./cart-schemas";

/**
 * Low-level server adapter for the cart endpoints.
 *
 * Owns fetch, auth headers, and error mapping. Returns Zod-validated DTOs;
 * see `cart-adapter.ts` for normalization into UI-ready `Cart` objects.
 */

export class CartApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "CartApiError";
    this.status = status;
  }
}

function firstValidationMessage(body: unknown): string | null {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const values = Object.values(body as Record<string, unknown>);
    const message = values.find((value) => typeof value === "string");
    if (typeof message === "string") {
      return message;
    }
  }
  return null;
}

async function request(path: string, init?: RequestInit): Promise<CartDTO> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeader(), ...init?.headers },
    });
  } catch (error) {
    throw new CartApiError(error instanceof Error ? error.message : "Network error.", 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new CartApiError("Please log in to manage your cart.", 401);
    }
    if (response.status === 404) {
      throw new CartApiError(
        typeof body === "string" && body ? body : "Cart or item not found.",
        404,
      );
    }
    throw new CartApiError(
      firstValidationMessage(body) ?? `Cart request failed (${response.status}).`,
      response.status,
    );
  }

  try {
    return parseCart(body);
  } catch {
    throw new CartApiError("Unexpected cart response from server.", response.status);
  }
}

function post(path: string, payload?: unknown): Promise<CartDTO> {
  return request(path, {
    method: "POST",
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

/** POST /api/carts */
export function apiCreateCart(): Promise<CartDTO> {
  return post("/api/carts");
}

/** GET /api/carts/:cartId */
export function apiGetCart(cartId: number): Promise<CartDTO> {
  return request(`/api/carts/${cartId}`);
}

export type NewCartItem = {
  productName: string;
  price: number;
  quantity: number;
};

/** POST /api/carts/:cartId/items */
export function apiAddItem(cartId: number, item: NewCartItem): Promise<CartDTO> {
  return post(`/api/carts/${cartId}/items`, item);
}

/** PATCH /api/carts/:cartId/items/:itemId */
export function apiUpdateItem(cartId: number, itemId: number, quantity: number): Promise<CartDTO> {
  return request(`/api/carts/${cartId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

/** DELETE /api/carts/:cartId/items/:itemId */
export function apiRemoveItem(cartId: number, itemId: number): Promise<CartDTO> {
  return request(`/api/carts/${cartId}/items/${itemId}`, { method: "DELETE" });
}
