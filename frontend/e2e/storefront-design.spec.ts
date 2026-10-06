import { expect, test } from "@playwright/test";
import { mockApi, placeOrder } from "./helpers";
test("mobile navigation and signed-out product return", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/products");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View product" }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/products\/1$/);
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await expect(page.getByLabel("1 items in cart")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("confirmed checkout polls for an eventual receipt", async ({ page }) => {
  await placeOrder(page);
  await expect(
    page.getByText("Your order is saved. We’re preparing your receipt."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download receipt" }),
  ).toBeVisible();
  await expect(
    page.getByText("Grove receipt — Apple — Total: 2.29"),
  ).toBeVisible();
});

test("search is restored after navigating back from product details", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/products?q=apple");
  await expect(page.getByRole("searchbox")).toHaveValue("apple");
  await page.getByRole("link", { name: "View product" }).click();
  await expect(page).toHaveURL(/\/products\/1$/);
  await page.goBack();
  await expect(page).toHaveURL(/q=apple/);
  await expect(page.getByRole("searchbox")).toHaveValue("apple");
});
test("a failed cart removal restores the line and displays recovery feedback", async ({
  page,
}) => {
  await placeOrder(page);
  await page.goto("/products/1");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/cart");
  await page.route("**/api/customer/cart/42/items/*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Unavailable" }),
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Remove Apple" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Could not update your cart",
  );
  await expect(
    page.getByRole("button", { name: "Remove Apple" }),
  ).toBeVisible();
});
test("expired customer responses redirect to sign-in", async ({ page }) => {
  await placeOrder(page);
  await page.route("**/api/customer/orders", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "My orders" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});
