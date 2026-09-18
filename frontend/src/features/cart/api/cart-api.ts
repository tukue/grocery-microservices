import { ApplicationError, createApplicationError } from "@/shared/errors/application-error";
import type { ServerHttpClient } from "@/shared/http/server-http-client";

import type { Cart } from "../domain/cart";
import { toCart } from "./cart.mapper";
import { addCartItemRequestSchema } from "./cart.schemas";

export type CartRequestContext = Readonly<{ authorization: string }>;
export type CartApi = Readonly<{
  addProduct(productId: number, quantity: number, context: CartRequestContext): Promise<Cart>;
  getCurrent(context: CartRequestContext): Promise<Cart>;
}>;

function authHeaders(context: CartRequestContext): HeadersInit {
  return { Authorization: context.authorization };
}

export function createCartApi(http: ServerHttpClient): CartApi {
  async function getCurrent(context: CartRequestContext): Promise<Cart> {
    return toCart(await http.request<unknown>({ headers: authHeaders(context), path: "/api/customer/cart" }));
  }

  async function createCurrent(context: CartRequestContext): Promise<Cart> {
    return toCart(await http.request<unknown>({ headers: authHeaders(context), method: "POST", path: "/api/customer/cart" }));
  }

  return {
    getCurrent,
    async addProduct(productId, quantity, context) {
      const request = addCartItemRequestSchema.parse({ productId, quantity });
      let cart: Cart;
      try {
        cart = await getCurrent(context);
      } catch (error) {
        if (!(error instanceof ApplicationError) || error.kind !== "not-found") throw error;
        cart = await createCurrent(context);
      }
      return toCart(await http.request<unknown>({
        body: request,
        headers: authHeaders(context),
        method: "POST",
        path: `/api/customer/cart/${cart.id}/items`,
      }));
    },
  };
}
