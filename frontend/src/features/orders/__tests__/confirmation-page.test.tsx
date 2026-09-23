import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrderError } from "../api/order-adapter";
import { ConfirmationPage } from "../components/confirmation-page";

const orderDto = {
  cartId: 42,
  id: 101,
  orderDate: "2026-09-17T14:45:00",
  orderLines: [
    {
      lineTotal: 59.8,
      productId: 12,
      productName: "Apples",
      quantity: 2,
      unitPrice: 29.9,
    },
  ],
  status: "PENDING",
  total: 59.8,
  userId: "customer-123",
};

function renderWithRoute(orderId: string) {
  return render(
    <MemoryRouter initialEntries={[`/confirmation/${orderId}`]}>
      <Routes>
        <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ConfirmationPage", () => {
  it("loads and displays the real order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(orderDto), { status: 200 }),
      ),
    );

    renderWithRoute("101");

    expect(screen.getByRole("status")).toHaveTextContent("Loading order...");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Order Confirmed" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Thank you for your order!")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("2026-09-17T14:45:00")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("59.80")).toBeInTheDocument();
    expect(screen.getByText(/Apples x 2/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/customer/orders/101");
  });

  it("shows an error when the order is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Order not found" }), {
          status: 404,
        }),
      ),
    );

    renderWithRoute("999");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Order not found or you do not have access to it.",
      );
    });
    expect(screen.queryByText("Thank you for your order!")).toBeNull();
  });

  it("shows an error for an invalid order id in the URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithRoute("not-a-number");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Order not found or you do not have access to it.",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps unexpected failures to a retry message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new OrderError(503, "Service unavailable")),
    );

    renderWithRoute("101");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to load order details. Please try again.",
      );
    });
  });
});
