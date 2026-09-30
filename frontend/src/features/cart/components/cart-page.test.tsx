import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/components/auth-context";
import { CartProvider } from "./cart-context";
import { CartPage } from "./cart-page";

describe("canonical CartPage", () => {
  it("renders authoritative lines and total", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ userId: "u", email: "u@example.com" }),
            { status: 200 },
          ),
        ),
    );
    const adapter = {
      getCurrentCart: vi.fn().mockResolvedValue({
        id: 1,
        status: "OPEN",
        items: [
          {
            id: 2,
            productId: 3,
            productName: "Apple",
            price: 2,
            quantity: 2,
          },
        ],
      }),
      createCart: vi.fn(),
      addItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
    };
    render(
      <MemoryRouter>
        <AuthProvider>
          <CartProvider adapter={adapter}>
            <CartPage />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Cart total: 4.00/)).toBeInTheDocument();
  });
});
