import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev:server",
      env: {
        BFF_PORT: "3000",
        CART_SERVICE_URL: "http://127.0.0.1:8081",
        ORDER_SERVICE_URL: "http://127.0.0.1:8082",
        PRODUCT_SERVICE_URL: "http://127.0.0.1:8083",
        REDIS_URL: "redis://127.0.0.1:6379",
        JWT_ISSUER_URI: "http://cart-service:8080",
        JWT_JWKS_URI: "http://127.0.0.1:8081/.well-known/jwks.json",
      },
      reuseExistingServer: !process.env.CI,
      url: "http://127.0.0.1:3000/health",
    },
    {
      command: "npm run dev:client -- --host 127.0.0.1",
      reuseExistingServer: !process.env.CI,
      url: baseURL,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
