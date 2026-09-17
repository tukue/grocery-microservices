import { z } from "zod";

export const serverEnvSchema = z.object({
  CART_SERVICE_URL: z.string().url(),
  ORDER_SERVICE_URL: z.string().url(),
  PRODUCT_SERVICE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: Record<string, unknown>): ServerEnv {
  return serverEnvSchema.parse(input);
}
