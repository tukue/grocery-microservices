import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartItem } from "./cart-item";
import { useCart } from "./cart-context";
vi.mock("./cart-context", () => ({ useCart: vi.fn() }));
const apple = {
  id: 1,
  productId: 10,
  productName: "Apple",
  price: 2,
  quantity: 2,
};
const banana = { ...apple, id: 2, productId: 11, productName: "Banana" };
const updateItem = vi.fn();
function context(pendingItems: Set<number>) {
  return {
    adapter: {
      getCurrentCart: vi.fn(),
      createCart: vi.fn(),
      addItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
    },
    cart: null,
    loading: false,
    error: null,
    itemCount: 4,
    pendingItems,
    addItem: vi.fn(),
    clear: vi.fn(),
    refresh: vi.fn(),
    updateItem,
    removeItem: vi.fn(),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  updateItem.mockResolvedValue({});
});
describe("per-item pending controls", () => {
  it("disables only the pending line and keeps other lines interactive", () => {
    vi.mocked(useCart).mockReturnValue(context(new Set([apple.id])));
    render(
      <>
        <CartItem item={apple} />
        <CartItem item={banana} />
      </>,
    );
    const pending = within(
      screen.getByRole("listitem", { name: "Apple, quantity 2" }),
    );
    for (const button of pending.getAllByRole("button"))
      expect(button).toBeDisabled();
    const other = within(
      screen.getByRole("listitem", { name: "Banana, quantity 2" }),
    );
    for (const button of other.getAllByRole("button"))
      expect(button).toBeEnabled();
    fireEvent.click(other.getByRole("button", { name: "Increase quantity" }));
    expect(updateItem).toHaveBeenCalledWith(banana.id, 3);
  });
  it("reenables the line after its pending entry is removed", () => {
    vi.mocked(useCart).mockReturnValue(context(new Set([apple.id])));
    const view = render(<CartItem item={apple} />);
    expect(
      screen.getByRole("button", { name: "Increase quantity" }),
    ).toBeDisabled();
    vi.mocked(useCart).mockReturnValue(context(new Set()));
    view.rerender(<CartItem item={apple} />);
    expect(
      screen.getByRole("button", { name: "Increase quantity" }),
    ).toBeEnabled();
  });
  it("still prevents decreasing the quantity below one", () => {
    vi.mocked(useCart).mockReturnValue(context(new Set()));
    render(<CartItem item={{ ...apple, quantity: 1 }} />);
    expect(
      screen.getByRole("button", { name: "Decrease quantity" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Increase quantity" }),
    ).toBeEnabled();
  });
});
