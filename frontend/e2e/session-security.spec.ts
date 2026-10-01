import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("login response and browser storage do not expose a JWT", async ({
  page,
}) => {
  const serviceRequests: string[] = [];
  page.on("request", (request) => {
    if (/:(8081|8082|8083)\//.test(request.url()))
      serviceRequests.push(request.url());
  });
  const login = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await signIn(page);
  expect(await (await login).text()).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  expect(serviceRequests).toEqual([]);
});
