import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    env: {
      CART_SERVICE_URL: "http://127.0.0.1:8080",
      ORDER_SERVICE_URL: "http://127.0.0.1:8081",
      PRODUCT_SERVICE_URL: "http://127.0.0.1:8083",
    },
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
