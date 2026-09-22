import { authHeader } from "../../auth/api/auth-client";
import { parseProduct, parseProductList, type Product } from "./product-schemas";

export class ProductApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ProductApiError";
    this.status = status;
  }
}

async function request(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { ...authHeader() } });
  } catch (error) {
    throw new ProductApiError(error instanceof Error ? error.message : "Network error.", 0);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new ProductApiError("Please log in to browse products.", 401);
    }
    if (response.status === 404) {
      throw new ProductApiError("Product not found.", 404);
    }
    throw new ProductApiError(`Product request failed (${response.status}).`, response.status);
  }

  return response.json().catch(() => null);
}

/** GET /api/products */
export async function listProducts(): Promise<Product[]> {
  try {
    return parseProductList(await request("/api/products"));
  } catch {
    throw new ProductApiError("Unexpected product response from server.");
  }
}

/** GET /api/products/:id */
export async function getProduct(productId: number): Promise<Product> {
  try {
    return parseProduct(await request(`/api/products/${productId}`));
  } catch (error) {
    if (error instanceof ProductApiError) {
      throw error;
    }
    throw new ProductApiError("Unexpected product response from server.");
  }
}
