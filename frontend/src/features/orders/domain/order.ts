export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type OrderLine = Readonly<{
  lineTotal: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}>;

export type Order = Readonly<{
  cartId: number;
  id: number;
  orderDate: string;
  orderLines: readonly OrderLine[];
  status: OrderStatus;
  total: number;
}>;

export type CartSummary = Readonly<{
  id: number;
  items: readonly OrderLine[];
  total: number;
}>;
