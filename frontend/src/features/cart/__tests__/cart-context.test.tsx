import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/components/auth-context";
import type { CartAdapter, CartDTO } from "../api/cart-adapter";
import { CartProvider, useCart } from "../components/cart-context";

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

const mockCart: CartDTO = {
  id: 1,
  status: "OPEN",
  items: [
    { id: 10, productId: 42, productName: "Apple", price: 2.5, quantity: 3 },
    { id: 11, productId: 43, productName: "Banana", price: 1.0, quantity: 2 },
  ],
};

function mockSession(session: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        ok
          ? new Response(JSON.stringify(session))
          : new Response("unauthorized", { status: 401 }),
      ),
  );
}

function Probe() {
  const { cart, loading, itemCount, updateItem } = useCart();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="apple-qty">
        {cart?.items.find((item) => item.id === 10)?.quantity ?? "none"}
      </span>
      <button
        type="button"
        onClick={() => {
          void updateItem(10, 9).catch(() => {});
        }}
      >
        bump apple
      </button>
    </div>
  );
}

function renderProvider(adapter: CartAdapter) {
  return render(
    <AuthProvider>
      <CartProvider adapter={adapter}>
        <Probe />
      </CartProvider>
    </AuthProvider>,
  );
}

describe("CartProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stays empty while logged out", async () => {
    mockSession(null, false);
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(adapter.getCurrentCart).not.toHaveBeenCalled();
  });

  it("loads the cart after login", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("5"),
    );
    expect(screen.getByTestId("apple-qty")).toHaveTextContent("3");
  });

  it("reverts optimistic updates when the server fails", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      updateItemQuantity: vi
        .fn()
        .mockRejectedValue({ status: 500, message: "boom" }),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("apple-qty")).toHaveTextContent("3"),
    );
    fireEvent.click(screen.getByText("bump apple"));
    await waitFor(() =>
      expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 9),
    );
    await waitFor(() =>
      expect(screen.getByTestId("apple-qty")).toHaveTextContent("3"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });
});
