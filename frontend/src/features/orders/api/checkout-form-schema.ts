import { z } from "zod";

export const checkoutFormSchema = z.object({
  idempotencyKey: z
    .string()
    .max(64, "Idempotency key must not exceed 64 characters")
    .optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
