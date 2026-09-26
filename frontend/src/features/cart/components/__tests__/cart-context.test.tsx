import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../../auth/components/auth-context";
import type { CartAdapter, CartDTO } from "../../api/cart-adapter";
import { CartProvider, useCart } from "../cart-context";

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
  const { cart, loading, error, itemCount, updateItem, removeItem } = useCart();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="error">{error ?? "no-error"}</span>
      <span data-testid="items">
        {(cart?.items ?? [])
          .map((item) => `${item.productName}:${item.quantity}`)
          .join(",") || "empty"}
      </span>
      <button
        type="button"
        onClick={() => {
          void updateItem(10, 9).catch(() => {});
        }}
      >
        bump apple
      </button>
      <button
        type="button"
        onClick={() => {
          void removeItem(11).catch(() => {});
        }}
      >
        drop banana
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

afterEach(() => vi.unstubAllGlobals());

describe("CartProvider", () => {
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
    expect(screen.getByTestId("items")).toHaveTextContent("empty");
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
    expect(screen.getByTestId("items")).toHaveTextContent("Apple:3,Banana:2");
  });

  it("reports an empty cart when the customer has none", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(null),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("items")).toHaveTextContent("empty");
    expect(screen.getByTestId("error")).toHaveTextContent("no-error");
  });

  it("applies optimistic quantity updates", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    let resolveUpdate: (cart: CartDTO) => void;
    const updatedCart: CartDTO = {
      id: 1,
      status: "OPEN",
      items: [
        {
          id: 10,
          productId: 42,
          productName: "Apple",
          price: 2.5,
          quantity: 9,
        },
        {
          id: 11,
          productId: 43,
          productName: "Banana",
          price: 1.0,
          quantity: 2,
        },
      ],
    };
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      updateItemQuantity: vi.fn().mockImplementation(
        () =>
          new Promise<CartDTO>((done) => {
            resolveUpdate = done;
          }),
      ),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("5"),
    );

    fireEvent.click(screen.getByText("bump apple"));
    // Optimistic: quantity flips to 9 before the server responds
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("Apple:9,Banana:2"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("11");

    resolveUpdate!(updatedCart);
    await waitFor(() =>
      expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 9),
    );
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("11"),
    );
  });

  it("rolls back optimistic updates when the server fails", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      updateItemQuantity: vi
        .fn()
        .mockRejectedValue({ status: 500, message: "boom" }),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("5"),
    );

    fireEvent.click(screen.getByText("bump apple"));
    await waitFor(() =>
      expect(adapter.updateItemQuantity).toHaveBeenCalledWith(1, 10, 9),
    );
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("Apple:3,Banana:2"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });

  it("applies optimistic remove and rolls back on failure", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockResolvedValue(mockCart),
      removeItem: vi.fn().mockRejectedValue({ status: 500, message: "boom" }),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("5"),
    );

    fireEvent.click(screen.getByText("drop banana"));
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("Apple:3"),
    );

    await waitFor(() => expect(adapter.removeItem).toHaveBeenCalledWith(1, 11));
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("Apple:3,Banana:2"),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });

  it("surfaces a load error when the cart request fails", async () => {
    mockSession({ userId: "u1", email: "a@b.c" });
    const adapter = createMockAdapter({
      getCurrentCart: vi.fn().mockRejectedValue({ status: 500 }),
    });
    renderProvider(adapter);
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Failed to load cart",
      ),
    );
  });
});
