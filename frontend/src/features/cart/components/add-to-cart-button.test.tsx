import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddToCartButton } from "./add-to-cart-button";

describe("AddToCartButton", () => {
  it("disables unavailable products", () => {
    render(<AddToCartButton available={false} productId={1} />);
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });

  it("prevents duplicate submissions and shows success feedback", async () => {
    let resolve: ((value: { message: string; status: "success" }) => void) | undefined;
    const addItem = vi.fn(() => new Promise<{ message: string; status: "success" }>((done) => { resolve = done; }));
    render(<AddToCartButton addItem={addItem} available productId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Adding..." }));
    expect(addItem).toHaveBeenCalledOnce();

    resolve?.({ message: "Added to cart.", status: "success" });
    expect(await screen.findByRole("status")).toHaveTextContent("Added to cart.");
  });

  it("shows failure feedback", async () => {
    render(<AddToCartButton addItem={async () => ({ message: "Try again.", status: "error" })} available productId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Try again.");
  });
});
