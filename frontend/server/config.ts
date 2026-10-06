import { z } from "zod";

const url = z.string().url();
const envSchema = z.object({
  BFF_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  CART_SERVICE_URL: url.default("http://localhost:8081"),
  ORDER_SERVICE_URL: url.default("http://localhost:8082"),
  LEDGER_SERVICE_URL: url.default("http://localhost:8084"),
  PRODUCT_SERVICE_URL: url.default("http://localhost:8083"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  JWT_AUDIENCE: z.string().min(1).default("grocery-api"),
  JWT_ISSUER_URI: url.optional(),
  JWT_JWKS_URI: url.optional(),
  REDIS_URL: url.optional(),
});

export type ServiceUrls = {
  cart: string;
  order: string;
  product: string;
  ledger: string;
};
export interface BffConfig {
  cookieSecure: boolean;
  jwt: { audience: string; issuer: string; jwksUri: string };
  port: number;
  redisUrl?: string;
  serviceUrls: ServiceUrls;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const parsed = envSchema.parse(env);
  const issuer = parsed.JWT_ISSUER_URI ?? parsed.CART_SERVICE_URL;
  return {
    cookieSecure: parsed.NODE_ENV === "production",
    jwt: {
      audience: parsed.JWT_AUDIENCE,
      issuer,
      jwksUri: parsed.JWT_JWKS_URI ?? `${issuer}/.well-known/jwks.json`,
    },
    port: parsed.BFF_PORT,
    redisUrl: parsed.REDIS_URL,
    serviceUrls: {
      cart: parsed.CART_SERVICE_URL,
      order: parsed.ORDER_SERVICE_URL,
      product: parsed.PRODUCT_SERVICE_URL,
      ledger: parsed.LEDGER_SERVICE_URL,
    },
  };
}
