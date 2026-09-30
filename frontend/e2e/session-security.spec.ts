import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_REAL_SERVICES, "requires the identity service");

test("session token remains behind the BFF", async ({ page }) => {
  const serviceRequests: string[] = [];
  page.on("request", (request) => {
    if (/:(8081|8082|8083)\//.test(request.url()))
      serviceRequests.push(request.url());
  });
  await page.goto("/login");
  await page
    .getByLabel("Username")
    .fill(process.env.E2E_USERNAME ?? "demo-user");
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "");
  const login = page.waitForResponse("**/api/auth/login");
  await page.getByRole("button", { name: "Sign In" }).click();
  expect(await (await login).text()).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  expect(serviceRequests).toEqual([]);
});
