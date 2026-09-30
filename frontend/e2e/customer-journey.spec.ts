import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_REAL_SERVICES,
  "requires the seeded microservice stack",
);

test("authenticated customer journey", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByRole("link", { name: "View product" }).first().click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page
    .getByLabel("Username")
    .fill(process.env.E2E_USERNAME ?? "demo-user");
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.goto("/products");
  await page.getByRole("link", { name: "View product" }).first().click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("link", { name: "Proceed to Checkout" }).click();
  await page.getByRole("button", { name: "Submit order" }).click();
  await expect(page).toHaveURL(/\/confirmation\/\d+$/);
  await page.reload();
  await expect(page.getByText(/^Total:/)).toBeVisible();
  await page.goto("/orders");
  await expect(page.getByRole("table")).toBeVisible();
});
