import { expect, test } from "@playwright/test";
import { placeOrder } from "./helpers";

test.skip(
  !process.env.E2E_REAL_SERVICES,
  "requires seeded product, cart, order, and identity services",
);

test("checkout confirmation can be reloaded", async ({ page }) => {
  await placeOrder(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Order Confirmed" }),
  ).toBeVisible();
});
