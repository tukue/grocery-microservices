import { z } from "zod";

export const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  available: z.boolean(),
  stockQuantity: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
});

export type ProductDTO = z.infer<typeof productSchema>;

const PRODUCTS_BASE = "/api/catalog/products";

async function parseProducts(response: Response): Promise<ProductDTO[]> {
  if (!response.ok) throw new Error("Unable to load products");

  try {
    const payload: unknown = await response.json();
    const result = z.array(productSchema).safeParse(payload);
    if (result.success) return result.data;
  } catch {
    // Do not expose transport or validation details to customer-facing callers.
  }

  throw new Error("Unable to read product data");
}

export async function fetchProducts(): Promise<ProductDTO[]> {
  return parseProducts(await fetch(PRODUCTS_BASE));
}

export async function searchProducts(name: string): Promise<ProductDTO[]> {
  return parseProducts(
    await fetch(`${PRODUCTS_BASE}/search?name=${encodeURIComponent(name)}`),
  );
}
