export type Product = Readonly<{
  available: boolean;
  currency: string;
  description: string;
  id: number;
  imageUrl?: string;
  name: string;
  price: number;
}>;
