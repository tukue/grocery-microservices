export type Product = Readonly<{
  available: boolean;
  currency: string;
  description: string;
  id: number;
  imageUrl?: string | null;
  name: string;
  price: number;
  stockQuantity?: number;
}>;
