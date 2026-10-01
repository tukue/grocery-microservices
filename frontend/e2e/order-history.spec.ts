import { expect, test } from "@playwright/test";
import { placeOrder } from "./helpers";
test("history opens an owned persisted order", async ({ page }) => {
  await placeOrder(page);
  await page.goto("/orders");
  await expect(
    page.getByRole("heading", { name: "Order History" }),
  ).toBeVisible();
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/confirmation\/\d+$/);
});
