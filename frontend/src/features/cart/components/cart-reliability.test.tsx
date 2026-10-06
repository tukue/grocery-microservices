import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useSession } from "../../auth";
import { CartProvider, useCart } from "./cart-context";
const cart = {
  id: 1,
  status: "OPEN",
  items: [{ id: 1, productId: 1, productName: "Apple", price: 2, quantity: 1 }],
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function Probe() {
  const { addItem, itemCount, loading } = useCart();
  const { logout } = useSession();
  return (
    <>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="count">{itemCount}</p>
      <button onClick={() => void addItem(1).catch(() => {})}>Add</button>
      <button onClick={() => void logout()}>Sign out</button>
    </>
  );
}
afterEach(() => vi.unstubAllGlobals());
function mockSession() {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          path.endsWith("logout")
            ? new Response(null, { status: 204 })
            : new Response(
                JSON.stringify({ userId: "customer", email: "c@example.test" }),
              ),
        ),
      ),
  );
}
describe("cart consistency", () => {
  it("guards overlapping adds before React can disable the button", async () => {
    mockSession();
    const pending = deferred<typeof cart>();
    const adapter = {
      getCurrentCart: vi.fn().mockResolvedValue(null),
      createCart: vi
        .fn()
        .mockResolvedValue({ id: 1, status: "OPEN", items: [] }),
      addItem: vi.fn().mockReturnValue(pending.promise),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
    };
    render(
      <AuthProvider>
        <CartProvider adapter={adapter}>
          <Probe />
        </CartProvider>
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(adapter.addItem).toHaveBeenCalledTimes(1));
    expect(adapter.createCart).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(cart);
    });
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("1"),
    );
  });
  it("ignores a cart response that arrives after sign-out", async () => {
    mockSession();
    const pending = deferred<typeof cart>();
    const adapter = {
      getCurrentCart: vi.fn().mockReturnValue(pending.promise),
      createCart: vi.fn(),
      addItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
    };
    render(
      <AuthProvider>
        <CartProvider adapter={adapter}>
          <Probe />
        </CartProvider>
      </AuthProvider>,
    );
    await waitFor(() => expect(adapter.getCurrentCart).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Sign out"));
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    await act(async () => {
      pending.resolve(cart);
    });
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("0"),
    );
  });
});
