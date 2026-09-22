import { toCart, type Cart } from "./cart-adapter";
import {
  apiAddItem,
  apiCreateCart,
  apiGetCart,
  apiRemoveItem,
  apiUpdateItem,
  type NewCartItem,
} from "./cart-api";

export { CartApiError } from "./cart-api";
export type { Cart };

const CART_ID_KEY = "grocery:cart-id";

function readCartId(): number | null {
  try {
    const raw = window.localStorage.getItem(CART_ID_KEY);
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeCartId(cartId: number): void {
  try {
    window.localStorage.setItem(CART_ID_KEY, String(cartId));
  } catch {
    // Cart-id persistence is best-effort.
  }
}

/**
 * Client-side functions for all cart operations.
 *
 * Every function resolves with the server-authoritative `Cart`
 * (Zod-validated, totals derived) and throws `CartApiError` on failure.
 */

export async function getCart(cartId: number): Promise<Cart> {
  return toCart(await apiGetCart(cartId));
}

export async function createCart(): Promise<Cart> {
  const cart = toCart(await apiCreateCart());
  if (typeof cart.id === "number") {
    writeCartId(cart.id);
  }
  return cart;
}

/** Returns the stored cart, creating one when none exists yet. */
export async function getOrCreateCart(): Promise<Cart> {
  const storedId = readCartId();
  if (storedId !== null) {
    try {
      return await getCart(storedId);
    } catch {
      // Stored cart is stale (e.g. dev database reset) — create a fresh one.
    }
  }
  return createCart();
}

export async function addItem(cartId: number, item: NewCartItem): Promise<Cart> {
  return toCart(await apiAddItem(cartId, item));
}

/** PATCH quantity; quantity 0 removes the line (server-side). */
export async function updateItem(cartId: number, itemId: number, quantity: number): Promise<Cart> {
  return toCart(await apiUpdateItem(cartId, itemId, quantity));
}

export async function removeItem(cartId: number, itemId: number): Promise<Cart> {
  return toCart(await apiRemoveItem(cartId, itemId));
}
