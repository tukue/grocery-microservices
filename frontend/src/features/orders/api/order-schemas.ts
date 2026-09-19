import { z } from 'zod';

export const CheckoutRequestSchema = z.object({
  cartId: z.number().int().positive('Cart ID must be positive'),
  idempotencyKey: z.string().max(64).optional(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const OrderStatusSchema = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderLineResponseSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int(),
  lineTotal: z.number(),
});

export type OrderLineResponse = z.infer<typeof OrderLineResponseSchema>;

export const OrderResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  status: OrderStatusSchema,
  orderDate: z.string(),
  total: z.number(),
  cartId: z.number(),
  orderLines: z.array(OrderLineResponseSchema),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrdersListResponseSchema = z.array(OrderResponseSchema);
export type OrdersListResponse = z.infer<typeof OrdersListResponseSchema>;
