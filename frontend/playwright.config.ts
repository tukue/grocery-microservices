import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:client -- --host 127.0.0.1",
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
