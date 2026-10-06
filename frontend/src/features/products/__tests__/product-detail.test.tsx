import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/components/auth-context";
import type { CartAdapter } from "../../cart/api/cart-adapter";
import { CartProvider } from "../../cart/components/cart-context";
import { ProductDetail } from "../components/product-detail";

function createMockAdapter(overrides: Partial<CartAdapter> = {}): CartAdapter {
  return {
    getCurrentCart: vi.fn(),
    createCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    ...overrides,
  } as unknown as CartAdapter;
}

const product = {
  id: 7,
  name: "Apple",
  description: "Crisp apples.",
  price: 2.5,
  currency: "USD",
  available: true,
  stockQuantity: 10,
};

function renderDetail(adapter: CartAdapter) {
  return render(
    <MemoryRouter initialEntries={["/products/7"]}>
      <AuthProvider>
        <CartProvider adapter={adapter}>
          <Routes>
            <Route path="/products/:id" element={<ProductDetail />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProductDetail", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the product with an add-to-cart action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: unknown) => {
        if (String(input).includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(JSON.stringify({ userId: "u1", email: "a@b.c" })),
          );
        }
        return Promise.resolve(new Response(JSON.stringify(product)));
      }),
    );
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(null),
    });
    renderDetail(adapter);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Apple" }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add to Cart" }),
      ).not.toBeDisabled(),
    );
    expect(screen.getByTestId("product-price")).toHaveTextContent(/2[.,]50/);
  });

  it("shows an error for unknown products", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );
    renderDetail(createMockAdapter());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/product not found/i),
    );
  });
});
