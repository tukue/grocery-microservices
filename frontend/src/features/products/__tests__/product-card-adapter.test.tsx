import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartAdapter, CartDTO } from "../../cart/api/cart-adapter";
import { ProductCard } from "../components/product-card";

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

const mockCart: CartDTO = { id: 1, status: "OPEN", items: [] };
const mockCartWithItem: CartDTO = {
  id: 1,
  status: "OPEN",
  items: [
    { id: 10, productId: 42, productName: "Apple", price: 2.5, quantity: 1 },
  ],
};

const product = {
  available: true,
  currency: "USD",
  description: "Crisp apples.",
  id: 42,
  name: "Apple",
  price: 2.5,
};

describe("ProductCard with adapter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders product name and price", () => {
    render(<ProductCard adapter={createMockAdapter()} product={product} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("$2.50")).toBeInTheDocument();
  });

  it("renders image when imageUrl is provided", () => {
    render(
      <ProductCard
        adapter={createMockAdapter()}
        product={{ ...product, imageUrl: "/apple.jpg" }}
      />,
    );
    expect(screen.getByRole("img", { name: "Apple" })).toHaveAttribute(
      "src",
      "/apple.jpg",
    );
  });

  it("disables add to cart for unavailable products", () => {
    render(
      <ProductCard
        adapter={createMockAdapter()}
        product={{ ...product, available: false }}
      />,
    );
    expect(screen.getByRole("button", { name: /unavailable/i })).toBeDisabled();
  });

  it("delegates add-to-cart API calls to the adapter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      addItem: vi.fn().mockResolvedValue(mockCartWithItem),
    });
    const onCartUpdated = vi.fn();

    render(
      <ProductCard
        adapter={adapter}
        onCartUpdated={onCartUpdated}
        product={product}
      />,
    );
    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    await waitFor(() => {
      expect(adapter.getCurrentCart).toHaveBeenCalledOnce();
      expect(adapter.addItem).toHaveBeenCalledWith(1, 42, 1);
      expect(onCartUpdated).toHaveBeenCalledWith(mockCartWithItem);
    });
  });
});
