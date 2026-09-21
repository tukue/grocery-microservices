import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect } from "vitest";

import { ConfirmationPage } from "../components/confirmation-page";

function renderWithRoute(orderId: string) {
  return render(
    <MemoryRouter initialEntries={[`/confirmation/${orderId}`]}>
      <Routes>
        <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConfirmationPage", () => {
  it("displays order confirmed heading", () => {
    renderWithRoute("42");
    expect(
      screen.getByRole("heading", { name: "Order Confirmed" }),
    ).toBeInTheDocument();
  });

  it("shows the order ID from the URL", () => {
    renderWithRoute("42");
    expect(screen.getByText("Order ID: 42")).toBeInTheDocument();
  });

  it("shows a thank-you message", () => {
    renderWithRoute("42");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you for your order!",
    );
  });
});
