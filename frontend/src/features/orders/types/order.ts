export interface OrderLine {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface Order {
  id: number;
  userId: string;
  status: OrderStatus;
  orderDate: string;
  total: number;
  cartId: number;
  orderLines: OrderLine[];
}

export interface OrderConfirmation {
  orderId: number;
  status: OrderStatus;
  total: number;
  orderDate: string;
  cartId: number;
}
