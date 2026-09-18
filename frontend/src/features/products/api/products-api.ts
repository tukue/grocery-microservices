import type { ServerHttpClient } from "@/shared/http/server-http-client";

import type { Product } from "../domain/product";
import { toProduct } from "./product.mapper";
import { productListResponseSchema } from "./product.schemas";

export type ProductsApi = Readonly<{
  list(search?: string): Promise<readonly Product[]>;
}>;

export function createProductsApi(http: ServerHttpClient): ProductsApi {
  return {
    async list(search?: string): Promise<readonly Product[]> {
      const normalizedSearch = search?.trim();
      const path = normalizedSearch
        ? `/products/search?name=${encodeURIComponent(normalizedSearch)}`
        : "/products";
      const response = await http.request<unknown>({ path });

      return productListResponseSchema.parse(response).map(toProduct);
    },
  };
}
