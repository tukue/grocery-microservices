import "server-only";

import { serverEnv } from "@/shared/config/server-env";
import { createServerHttpClient } from "@/shared/http/server-http-client";

import { createProductsApi } from "./products-api";

const productsApi = createProductsApi(
  createServerHttpClient({ baseUrl: serverEnv.PRODUCT_SERVICE_URL }),
);

export function getProducts(search?: string) {
  return productsApi.list(search);
}
