import { expect, test, type Page } from "@playwright/test";

const products = [
  {
    available: true,
    currency: "USD",
    description: "Crisp apples.",
    id: 12,
    name: "Apples",
    price: 29.9,
    stockQuantity: 100,
  },
  {
    available: true,
    currency: "USD",
    description: "Fresh bananas.",
    id: 13,
    name: "Bananas",
    price: 12.5,
    stockQuantity: 50,
  },
];

type CartItem = {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
};

const order = {
  cartId: 42,
  id: 901,
  orderDate: "2026-09-18T10:00:00",
  orderLines: [
    {
      lineTotal: 12.5,
      productId: 13,
      productName: "Bananas",
      quantity: 1,
      unitPrice: 12.5,
    },
  ],
  status: "PENDING",
  total: 12.5,
  userId: "test-customer",
};

function errorBody(status: number, message: string) {
  return JSON.stringify({
    timestamp: "2026-09-18T10:00:00",
    status,
    error: status === 404 ? "Not Found" : "Error",
    message,
  });
}

async function mockApis(page: Page) {
  let loggedIn = false;
  let cartExists = false;
  let cartItems: CartItem[] = [];
  let nextItemId = 100;

  await page.route("**/api/auth/me", (route) => {
    if (!loggedIn) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not authenticated" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "test-customer",
        email: "test@example.com",
      }),
    });
  });

  await page.route("**/api/auth/login", (route) => {
    loggedIn = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { userId: "test-customer", email: "test@example.com" },
        type: "Bearer",
      }),
    });
  });

  await page.route("**/api/auth/logout", (route) => {
    loggedIn = false;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/catalog/products**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(products),
    }),
  );

  await page.route("**/api/customer/cart**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();

    const cartPayload = () =>
      JSON.stringify({ id: 42, status: "OPEN", items: cartItems });

    if (method === "GET" && /\/cart$/.test(path)) {
      if (!cartExists) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: errorBody(404, "No cart"),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: cartPayload(),
      });
    }

    if (method === "POST" && /\/cart$/.test(path)) {
      cartExists = true;
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: cartPayload(),
      });
    }

    if (method === "POST" && /\/cart\/\d+\/items$/.test(path)) {
      const body = req.postDataJSON() as {
        productId: number;
        quantity: number;
      };
      const product = products.find((p) => p.id === body.productId);
      if (!product) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: errorBody(404, "Product not found"),
        });
      }
      const existing = cartItems.find((i) => i.productId === body.productId);
      if (existing) {
        existing.quantity += body.quantity;
      } else {
        cartItems.push({
          id: nextItemId++,
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: body.quantity,
        });
      }
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: cartPayload(),
      });
    }

    if (method === "PATCH" && /\/cart\/\d+\/items\/\d+$/.test(path)) {
      const body = req.postDataJSON() as { quantity: number };
      const itemId = Number(path.split("/").pop());
      const item = cartItems.find((i) => i.id === itemId);
      if (item) item.quantity = body.quantity;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: cartPayload(),
      });
    }

    if (method === "DELETE" && /\/cart\/\d+\/items\/\d+$/.test(path)) {
      const itemId = Number(path.split("/").pop());
      cartItems = cartItems.filter((i) => i.id !== itemId);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: cartPayload(),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: errorBody(404, "Not found"),
    });
  });

  await page.route("**/api/customer/checkout", (route) => {
    cartItems = [];
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(order),
    });
  });

  await page.route("**/api/customer/orders/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(order),
    }),
  );

  await page.route("**/api/customer/orders", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );
}

test("customer can complete a happy-path checkout journey", async ({
  page,
}) => {
  await mockApis(page);

  // 1. Sign in
  await page.goto("/login");
  await page.getByLabel("Username").fill("test-customer");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

  // 2. Browse products
  await expect(page.getByRole("heading", { name: "Apples" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bananas" })).toBeVisible();

  // 3. Add Apples to cart
  const applesCard = page.locator("article").filter({ hasText: "Apples" });
  await applesCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(applesCard.getByRole("status")).toHaveText("Added!");

  // 4. Open cart and update quantity
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
  await expect(page.getByText("Apples")).toBeVisible();

  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByText("Qty: 2")).toBeVisible();

  // 5. Remove Apples
  await page.getByRole("button", { name: "Remove Apples" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();

  // 6. Add a different item (Bananas) from products
  await page.getByRole("link", { name: "Browse products" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  const bananasCard = page.locator("article").filter({ hasText: "Bananas" });
  await bananasCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(bananasCard.getByRole("status")).toHaveText("Added!");

  // 7. Checkout
  await page.goto("/cart");
  await expect(page.getByText("Bananas")).toBeVisible();
  await page.getByRole("link", { name: "Proceed to Checkout" }).click();
  await expect(page.getByText("Cart total: 12.50")).toBeVisible();
  await page.getByLabel("Order reference (optional)").fill("ref-1");
  await page.getByRole("button", { name: "Submit order" }).click();

  // 8. Confirmation shows order details
  await expect(
    page.getByRole("heading", { name: "Order Confirmed" }),
  ).toBeVisible();
  await expect(page.getByText("Order ID")).toBeVisible();
  await expect(page.getByText("901")).toBeVisible();
  await expect(page.getByText("Bananas x 1 — 12.50")).toBeVisible();

  // 9. Reload confirmation page
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Order Confirmed" }),
  ).toBeVisible();
  await expect(page.getByText("Order ID")).toBeVisible();
  await expect(page.getByText("901")).toBeVisible();
});
