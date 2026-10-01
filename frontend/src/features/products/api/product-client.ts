import {
  productListResponseSchema,
  productResponseSchema,
  type ProductResponse,
} from "./product.schemas";

const BASE = "/api/catalog/products";
export class ProductClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function request(path: string): Promise<unknown> {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
  });
  if (!response.ok)
    throw new ProductClientError(
      response.status === 404 ? "Product not found" : "Unable to load products",
      response.status,
    );
  return response.json();
}
export async function fetchProducts(
  signal?: AbortSignal,
): Promise<ProductResponse[]> {
  const response = await fetch(BASE, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok)
    throw new ProductClientError("Unable to load products", response.status);
  return productListResponseSchema.parse(await response.json());
}
export async function searchProducts(
  name: string,
  signal?: AbortSignal,
): Promise<ProductResponse[]> {
  const normalized = name.trim();
  if (!normalized) return fetchProducts(signal);
  const response = await fetch(
    `${BASE}/search?name=${encodeURIComponent(normalized)}`,
    { headers: { accept: "application/json" }, signal },
  );
  if (!response.ok)
    throw new ProductClientError("Unable to search products", response.status);
  return productListResponseSchema.parse(await response.json());
}
export async function fetchProduct(id: number): Promise<ProductResponse> {
  if (!Number.isInteger(id) || id <= 0)
    throw new ProductClientError("Invalid product", 400);
  return productResponseSchema.parse(await request(`${BASE}/${id}`));
}
