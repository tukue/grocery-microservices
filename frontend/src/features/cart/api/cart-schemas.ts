import { z } from "zod";

/**
 * Runtime contracts for the cart API.
 *
 * Backend source of truth: `CartController` / `CartService` in cart-service
 * (`microservices/cart-service`), served at:
 *
 * - POST   /carts
 * - GET    /carts/{id}
 * - POST   /carts/{cartId}/items        { productName, price, quantity }
 * - PATCH  /carts/{cartId}/items/{itemId}  { quantity }  (0 removes the line)
 * - DELETE /carts/{cartId}/items/{itemId}
 *
 * The Vite dev proxy maps `/api/carts/**` -> cart-service (:8081).
 * Totals are derived client-side from item prices (the backend stores
 * no total).
 */

export const CartItemSchema = z.object({
  id: z.number().int().positive().nullable(),
  productName: z.string().trim().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(0),
});

export const CartSchema = z.object({
  id: z.number().int().positive().nullable(),
  items: z.array(CartItemSchema),
});

export const UpdateQuantitySchema = z.object({
  quantity: z.number().int().min(0),
});

export type CartItemDTO = z.infer<typeof CartItemSchema>;
export type CartDTO = z.infer<typeof CartSchema>;

/** Cart enriched with client-derived totals. */
export type Cart = CartDTO & {
  total: number;
  itemCount: number;
};

export function parseCart(data: unknown): CartDTO {
  return CartSchema.parse(data);
}
