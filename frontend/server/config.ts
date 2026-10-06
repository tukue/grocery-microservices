import { z } from "zod";

const url = z.string().url();

/**
 * Environment schema for the Node.js BFF.
 *
 * After introducing Spring Cloud Gateway, the BFF no longer holds a map of
 * individual service URLs. All backend traffic is routed through the gateway,
 * which owns the route table. The BFF's sole responsibility is session
 * management (login, logout, /me) and cookie handling.
 *
 * BEFORE: CART_SERVICE_URL, ORDER_SERVICE_URL, PRODUCT_SERVICE_URL each pointed
 *         at a separate Spring Boot service.
 * AFTER:  GATEWAY_URL points at the single gateway entry point. The gateway
 *         dispatches /api/catalog/**, /api/customer/**, and /api/auth/** to the
 *         correct upstream service.
 */
const envSchema = z.object({
  BFF_PORT: z.coerce.number().int().positive().max(65535).default(3000),

  /**
   * Spring Cloud Gateway base URL.
   * Dev:    http://localhost:8085
   * Docker: http://gateway-service:8080  (resolved by Docker Compose DNS)
   */
  GATEWAY_URL: url.default("http://localhost:8085"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  JWT_AUDIENCE: z.string().min(1).default("grocery-api"),

  /**
   * JWKS discovery URI used by the BFF to verify tokens it receives from the
   * gateway on the /api/auth/me path. Defaults to the gateway's own issuer
   * (cart-service in dev) via the gateway's JWT_ISSUER_URI.
   */
  JWT_ISSUER_URI: url.optional(),
  JWT_JWKS_URI: url.optional(),

  REDIS_URL: url.optional(),
});

/**
 * Service URLs visible to the BFF.
 *
 * All three point at the gateway — the gateway's route table handles
 * dispatching to the real service. This keeps the BFF's routing concern simple:
 * it only needs to know the gateway address.
 */
export type ServiceUrls = {
  /** Used for /api/catalog/** routes */
  product: string;
  /** Used for /api/customer/cart routes */
  cart: string;
  /** Used for /api/customer/orders and /api/customer/checkout routes */
  order: string;
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
  const gatewayUrl = parsed.GATEWAY_URL;

  // The issuer is still cart-service; the BFF fetches JWKS from the gateway's
  // /api/auth path which the gateway proxies to the BFF, which in turn relies
  // on the cart-service demo IdP. In a real deployment replace with the OIDC
  // provider's issuer URI.
  const issuer = parsed.JWT_ISSUER_URI ?? gatewayUrl;

  return {
    cookieSecure: parsed.NODE_ENV === "production",
    jwt: {
      audience: parsed.JWT_AUDIENCE,
      issuer,
      jwksUri: parsed.JWT_JWKS_URI ?? `${issuer}/.well-known/jwks.json`,
    },
    port: parsed.BFF_PORT,
    redisUrl: parsed.REDIS_URL,
    // All three service URL slots point at the gateway — the gateway routes internally
    serviceUrls: {
      cart: gatewayUrl,
      order: gatewayUrl,
      product: gatewayUrl,
    },
  };
}
