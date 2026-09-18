import "server-only";

import { serverEnv } from "@/shared/config/server-env";
import { createServerHttpClient } from "@/shared/http/server-http-client";

import { createCartApi } from "./cart-api";

const cartApi = createCartApi(createServerHttpClient({ baseUrl: serverEnv.CART_SERVICE_URL }));

export function getCurrentCart(authorization: string) {
  return cartApi.getCurrent({ authorization });
}

export function addProductToCart(productId: number, quantity: number, authorization: string) {
  return cartApi.addProduct(productId, quantity, { authorization });
}
