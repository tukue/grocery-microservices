import { expect, test } from "@playwright/test";

test("customer can complete a controlled checkout journey", async ({
  page,
}) => {
  let orderSubmissionCount = 0;
  await page.route("**/api/orders/checkout", async (route) => {
    orderSubmissionCount += 1;
    await route.fulfill({
      body: JSON.stringify({
        cartId: 42,
        id: 901,
        orderDate: "2026-09-18T10:00:00",
        orderLines: [
          {
            lineTotal: 59.8,
            productId: 12,
            productName: "Apples",
            quantity: 2,
            unitPrice: 29.9,
          },
        ],
        status: "PENDING",
        total: 59.8,
        userId: "test-customer",
      }),
      contentType: "application/json",
      status: 201,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Add Apples to cart" }).click();
  await page.getByRole("button", { name: /Open cart/ }).click();
  const quantityInput = page.getByRole("spinbutton", { name: "Quantity" });
  await expect(quantityInput).toBeVisible();
  await quantityInput.fill("2");
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page.getByText("Cart total: 59.80")).toBeVisible();
  await page.getByRole("button", { name: "Submit order" }).click();

  await expect(page.getByRole("status")).toHaveText("Order #901 confirmed");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
  expect(orderSubmissionCount).toBe(1);
});
