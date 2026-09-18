export type Product = Readonly<{
  available: boolean;
  id: number;
  imageUrl?: string;
  name: string;
  price: number;
}>;
