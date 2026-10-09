import { z } from "zod";

const httpUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  });
const origin = httpUrl.refine((value) => new URL(value).origin === value);
const envSchema = z.object({
  BFF_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  GATEWAY_URL: origin.default("http://localhost:8085"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PUBLIC_ORIGIN: origin.default("http://localhost:5173"),
  JWT_AUDIENCE: z.string().min(1).default("grocery-api"),
  JWT_ISSUER_URI: httpUrl.default("http://localhost:8081"),
  JWT_JWKS_URI: httpUrl.optional(),
  REDIS_URL: z
    .string()
    .url()
    .refine((value) => ["redis:", "rediss:"].includes(new URL(value).protocol))
    .optional(),
  SESSION_NAMESPACE: z
    .string()
    .regex(/^[a-zA-Z0-9:_-]{1,80}$/)
    .default("grove:development"),
  AUTH_MODE: z.enum(["demo", "oidc"]).default("demo"),
  DEMO_IDENTITY_BASE_URL: origin.default("http://localhost:8081"),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  OIDC_REDIRECT_URI: httpUrl.optional(),
});

export type ServiceUrls = Record<
  "product" | "cart" | "order" | "ledger",
  string
>;
export type OidcConfig = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
};
export interface BffConfig {
  cookieSecure: boolean;
  jwt: { audience: string; issuer: string; jwksUri: string };
  port: number;
  redisUrl?: string;
  serviceUrls: ServiceUrls;
  gatewayUrl?: string;
  publicOrigin?: string;
  sessionNamespace?: string;
  vercelClientIp?: boolean;
  auth?:
    | { mode: "demo"; demoIdentityUrl: string }
    | { mode: "oidc"; oidc: OidcConfig };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const result = envSchema.safeParse({
    ...env,
    BFF_PORT: env.BFF_PORT ?? env.PORT,
  });
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new Error(`Invalid BFF configuration: ${names.join(", ")}`);
  }
  const parsed = result.data;
  const issuer = parsed.JWT_ISSUER_URI;
  const jwksUri =
    parsed.JWT_JWKS_URI ?? `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
  if (
    parsed.AUTH_MODE === "oidc" &&
    (!parsed.OIDC_CLIENT_ID || !parsed.OIDC_REDIRECT_URI)
  )
    throw new Error(
      "Invalid BFF configuration: OIDC_CLIENT_ID and OIDC_REDIRECT_URI are required",
    );
  if (
    parsed.OIDC_REDIRECT_URI &&
    parsed.OIDC_REDIRECT_URI !== `${parsed.PUBLIC_ORIGIN}/api/auth/callback`
  )
    throw new Error(
      "Invalid BFF configuration: OIDC_REDIRECT_URI must match PUBLIC_ORIGIN/api/auth/callback",
    );
  if (parsed.NODE_ENV === "production") {
    const required = [
      "GATEWAY_URL",
      "PUBLIC_ORIGIN",
      "JWT_ISSUER_URI",
      "JWT_JWKS_URI",
      "JWT_AUDIENCE",
      "REDIS_URL",
      "SESSION_NAMESPACE",
      "AUTH_MODE",
    ];
    const missing = required.filter((name) => !env[name]);
    if (missing.length)
      throw new Error(
        `Invalid BFF configuration: production requires ${missing.join(", ")}`,
      );
    if (parsed.AUTH_MODE !== "oidc")
      throw new Error(
        "Invalid BFF configuration: demo authentication is development-only",
      );
    if (
      [
        parsed.GATEWAY_URL,
        parsed.PUBLIC_ORIGIN,
        issuer,
        jwksUri,
        parsed.OIDC_REDIRECT_URI!,
      ].some((value) => new URL(value).protocol !== "https:")
    )
      throw new Error(
        "Invalid BFF configuration: production HTTP endpoints must use HTTPS",
      );
    if (new URL(parsed.REDIS_URL!).protocol !== "rediss:")
      throw new Error(
        "Invalid BFF configuration: production Redis must use TLS (rediss://)",
      );
  }
  return {
    cookieSecure: parsed.NODE_ENV === "production",
    jwt: { audience: parsed.JWT_AUDIENCE, issuer, jwksUri },
    port: parsed.BFF_PORT,
    publicOrigin: parsed.PUBLIC_ORIGIN,
    gatewayUrl: parsed.GATEWAY_URL,
    redisUrl: parsed.REDIS_URL,
    sessionNamespace: parsed.SESSION_NAMESPACE,
    vercelClientIp: env.VERCEL === "1",
    auth:
      parsed.AUTH_MODE === "oidc"
        ? {
            mode: "oidc",
            oidc: {
              clientId: parsed.OIDC_CLIENT_ID!,
              clientSecret: parsed.OIDC_CLIENT_SECRET,
              redirectUri: parsed.OIDC_REDIRECT_URI!,
            },
          }
        : { mode: "demo", demoIdentityUrl: parsed.DEMO_IDENTITY_BASE_URL },
    serviceUrls: {
      cart: parsed.GATEWAY_URL,
      order: parsed.GATEWAY_URL,
      product: parsed.GATEWAY_URL,
      ledger: parsed.GATEWAY_URL,
    },
  };
}
