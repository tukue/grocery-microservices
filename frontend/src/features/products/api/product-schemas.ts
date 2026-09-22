import { z } from "zod";

/**
 * Runtime contracts for the product API.
 *
 * Backend source of truth: `ProductController` in product-service
 * (`microservices/product-service`), served at:
 *
 * - GET /products
 * - GET /products/{id}
 *
 * The Vite dev proxy maps `/api/products/**` -> product-service (:8083).
 */

export const ProductSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1),
  price: z.number().positive(),
});

export type Product = z.infer<typeof ProductSchema>;

export function parseProduct(data: unknown): Product {
  return ProductSchema.parse(data);
}

export function parseProductList(data: unknown): Product[] {
  return z.array(ProductSchema).parse(data);
}
