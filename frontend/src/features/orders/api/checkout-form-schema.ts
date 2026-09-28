import { z } from "zod";

export const checkoutFormSchema = z.object({});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
