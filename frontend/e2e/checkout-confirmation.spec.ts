import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_REAL_SERVICES,
  "requires seeded product, cart, order, and identity services",
);

test("checkout confirmation can be reloaded", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByRole("button", { name: "Submit order" }).click();
  await expect(page).toHaveURL(/\/confirmation\/\d+$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Order Confirmed" }),
  ).toBeVisible();
});
