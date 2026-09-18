import type { Product } from "../domain/product";
import { productResponseSchema, type ProductResponse } from "./product.schemas";

export function toProduct(response: unknown): Product {
  const product: ProductResponse = productResponseSchema.parse(response);

  return {
    available: product.available,
    id: product.id,
    imageUrl: product.imageUrl ?? undefined,
    name: product.name,
    price: product.price,
  };
}
