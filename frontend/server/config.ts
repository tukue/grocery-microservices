import { z } from "zod";

const url = z.string().url();
const envSchema = z.object({
  BFF_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CART_SERVICE_URL: url.default("http://localhost:8081"),
  ORDER_SERVICE_URL: url.default("http://localhost:8082"),
  PRODUCT_SERVICE_URL: url.default("http://localhost:8083"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServiceUrls = { cart: string; order: string; product: string };
export interface BffConfig {
  cookieSecure: boolean;
  port: number;
  serviceUrls: ServiceUrls;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const parsed = envSchema.parse(env);
  return {
    cookieSecure: parsed.NODE_ENV === "production",
    port: parsed.BFF_PORT,
    serviceUrls: {
      cart: parsed.CART_SERVICE_URL,
      order: parsed.ORDER_SERVICE_URL,
      product: parsed.PRODUCT_SERVICE_URL,
    },
  };
}
