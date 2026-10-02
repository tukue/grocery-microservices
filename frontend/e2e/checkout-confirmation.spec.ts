import { expect, test } from "@playwright/test";
import { placeOrder } from "./helpers";

test("checkout confirmation can be reloaded", async ({ page }) => {
  await placeOrder(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Order Confirmed" }),
  ).toBeVisible();
});
