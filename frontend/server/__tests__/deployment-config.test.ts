// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";
import { resolveService } from "../proxy";

const production = {
  NODE_ENV: "production",
  GATEWAY_URL: "https://gateway.example.test",
  REDIS_URL: "rediss://redis.example.test:6380",
  SESSION_NAMESPACE: "grove:production",
  PUBLIC_ORIGIN: "https://shop.example.test",
  JWT_ISSUER_URI: "https://identity.example.test",
  JWT_JWKS_URI: "https://identity.example.test/jwks",
  JWT_AUDIENCE: "grocery-api",
  AUTH_MODE: "oidc",
  OIDC_CLIENT_ID: "storefront",
  OIDC_REDIRECT_URI: "https://shop.example.test/api/auth/callback",
};

describe("deployment configuration", () => {
  it("keeps catalogue paths intact when targeting Gateway", () => {
    const config = loadConfig({});
    expect(
      resolveService(
        "GET",
        "/api/catalog/products?q=apple",
        config.serviceUrls,
        config.gatewayUrl,
      )?.upstreamPath,
    ).toBe("/api/catalog/products");
  });
  it("rejects incomplete production setup without leaking values", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        REDIS_URL: "rediss://secret:credential@redis.test",
      }),
    ).toThrow(/Invalid BFF configuration/);
    try {
      loadConfig({
        NODE_ENV: "production",
        REDIS_URL: "rediss://secret:credential@redis.test",
      });
    } catch (error) {
      expect(String(error)).not.toContain("credential");
    }
  });
  it("accepts explicit secure production settings", () => {
    expect(loadConfig(production)).toMatchObject({
      cookieSecure: true,
      gatewayUrl: production.GATEWAY_URL,
      publicOrigin: production.PUBLIC_ORIGIN,
      sessionNamespace: "grove:production",
      auth: { mode: "oidc" },
    });
  });
  it.each([
    { AUTH_MODE: "demo" },
    { GATEWAY_URL: "http://localhost:8085" },
    { REDIS_URL: "redis://redis.example.test" },
    { PUBLIC_ORIGIN: "https://shop.example.test/path" },
    { OIDC_REDIRECT_URI: "https://attacker.test/api/auth/callback" },
  ])("fails closed for unsafe production settings %j", (override) => {
    expect(() => loadConfig({ ...production, ...override })).toThrow();
  });
});
