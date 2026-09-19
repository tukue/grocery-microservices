export interface ProductDTO {
  id: number;
  name: string;
  price: number;
  available: boolean;
  stockQuantity: number;
  imageUrl?: string;
}

const PRODUCTS_BASE = '/products';

export async function fetchProducts(): Promise<ProductDTO[]> {
  const response = await fetch(PRODUCTS_BASE);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function searchProducts(name: string): Promise<ProductDTO[]> {
  const response = await fetch(`${PRODUCTS_BASE}/search?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error('Failed to search products');
  return response.json();
}
