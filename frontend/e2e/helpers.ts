import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Username")
    .fill(process.env.E2E_USERNAME ?? "demo-user");
  await page
    .getByLabel("Password")
    .fill(process.env.E2E_PASSWORD ?? "ci-demo-password");
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign In" }).click();
  const response = await loginResponse;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function addProductToCart(page: Page) {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  const productLink = page.getByRole("link", { name: "View product" }).first();
  await expect(productLink).toBeVisible();
  await productLink.click();
  const addButton = page.getByRole("button", { name: "Add to Cart" });
  await expect(addButton).toBeEnabled();
  const addResponse = page.waitForResponse(
    (response) =>
      /\/api\/customer\/cart\/\d+\/items$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await addButton.click();
  const response = await addResponse;
  expect(response.status(), await response.text()).toBe(200);
}

export async function placeOrder(page: Page) {
  await signIn(page);
  await addProductToCart(page);
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  const checkoutResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/customer/checkout") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit order" }).click();
  const response = await checkoutResponse;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page).toHaveURL(/\/confirmation\/\d+$/);
}
