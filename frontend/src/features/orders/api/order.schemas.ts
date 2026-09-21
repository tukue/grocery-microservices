import { z } from "zod";

export const checkoutRequestSchema = z.object({
  cartId: z.number().int().positive(),
  idempotencyKey: z
    .string()
    .max(64, "Idempotency key must not exceed 64 characters")
    .optional(),
});

export const orderLineResponseSchema = z.object({
  lineTotal: z.number(),
  productId: z.number().int(),
  productName: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
});

export const orderResponseSchema = z.object({
  cartId: z.number().int(),
  id: z.number().int(),
  orderDate: z.string(),
  orderLines: z.array(orderLineResponseSchema),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
  total: z.number(),
  userId: z.string(),
});

export const orderStatusSchema = z.enum(["PENDING", "COMPLETED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const ordersListResponseSchema = z.array(orderResponseSchema);
export type OrdersListResponse = z.infer<typeof ordersListResponseSchema>;

export type CheckoutRequestDto = z.infer<typeof checkoutRequestSchema>;
export type OrderResponseDto = z.infer<typeof orderResponseSchema>;
