import { expect, test } from "@playwright/test";
test.skip(
  !process.env.E2E_REAL_SERVICES,
  "requires seeded multi-user services",
);
test("history opens an owned persisted order", async ({ page }) => {
  await page.goto("/orders");
  await expect(
    page.getByRole("heading", { name: "Order History" }),
  ).toBeVisible();
  await page.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/confirmation\/\d+$/);
});
