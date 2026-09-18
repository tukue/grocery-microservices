import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createApplicationError } from "@/shared/errors/application-error";

import { CheckoutForm } from "./checkout-form";

const cart = {
  id: 42,
  items: [
    {
      lineTotal: 29.9,
      productId: 12,
      productName: "Apples",
      quantity: 1,
      unitPrice: 29.9,
    },
  ],
  total: 29.9,
};
const order = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [],
  status: "PENDING" as const,
  total: 29.9,
};

describe("CheckoutForm", () => {
  it("shows accessible validation errors for unsupported idempotency key length", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutForm cart={cart} onConfirmed={vi.fn()} submitOrder={vi.fn()} />,
    );
    await user.type(
      screen.getByLabelText("Order reference (optional)"),
      "x".repeat(65),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Idempotency key must not exceed 64 characters",
    );
    expect(screen.getByRole("button", { name: "Submit order" })).toBeDisabled();
  });

  it("confirms only with the backend order ID", async () => {
    const user = userEvent.setup();
    const onConfirmed = vi.fn();
    render(
      <CheckoutForm
        cart={cart}
        onConfirmed={onConfirmed}
        submitOrder={vi.fn().mockResolvedValue(order)}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Submit order" }));
    expect(onConfirmed).toHaveBeenCalledWith(order);
  });

  it("preserves entered data and shows safe failures", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutForm
        cart={cart}
        onConfirmed={vi.fn()}
        submitOrder={vi
          .fn()
          .mockRejectedValue(createApplicationError("timeout"))}
      />,
    );
    const input = screen.getByLabelText("Order reference (optional)");
    await user.type(input, "retry-42");
    await user.click(screen.getByRole("button", { name: "Submit order" }));
    expect(input).toHaveValue("retry-42");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The request took too long",
    );
  });

  it("allows only one active submission", async () => {
    const user = userEvent.setup();
    let resolveOrder: ((value: typeof order) => void) | undefined;
    const submitOrder = vi.fn(
      () =>
        new Promise<typeof order>((resolve) => {
          resolveOrder = resolve;
        }),
    );
    render(
      <CheckoutForm
        cart={cart}
        onConfirmed={vi.fn()}
        submitOrder={submitOrder}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Submit order" });
    await user.click(submitButton);
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(submitOrder).toHaveBeenCalledTimes(1);
    resolveOrder?.(order);
  });
});
