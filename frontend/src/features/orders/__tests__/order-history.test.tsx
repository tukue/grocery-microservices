import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrderError } from "../api/order-adapter";
import { OrderHistory } from "../components/order-history";

const ordersDto = [
  {
    cartId: 42,
    id: 101,
    orderDate: "2026-09-17T14:45:00",
    orderLines: [],
    status: "PENDING",
    total: 59.8,
    userId: "customer-123",
  },
  {
    cartId: 43,
    id: 102,
    orderDate: "2026-09-18T10:00:00",
    orderLines: [],
    status: "COMPLETED",
    total: 12.5,
    userId: "customer-123",
  },
];

function renderHistory() {
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <Routes>
        <Route path="/orders" element={<OrderHistory />} />
        <Route
          path="/confirmation/:orderId"
          element={<div>Confirmation for order</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OrderHistory", () => {
  it("loads and lists customer orders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ordersDto), { status: 200 }),
      ),
    );

    renderHistory();

    expect(screen.getByRole("status")).toHaveTextContent("Loading orders...");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("102")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("59.80")).toBeInTheDocument();
    expect(screen.getByText("12.50")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/customer/orders");
  });

  it("navigates to the confirmation page when a row is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ordersDto), { status: 200 }),
      ),
    );

    const user = userEvent.setup();
    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    await user.click(screen.getByText("102"));
    expect(
      screen.getByText("Confirmation for order"),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no orders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })),
    );

    renderHistory();

    await waitFor(() => {
      expect(
        screen.getByText("You have not placed any orders yet."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows an error when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "You do not have permission to view these orders.",
      );
    });
  });

  it("maps unexpected failures to a retry message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new OrderError(503, "Service unavailable")),
    );

    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to load orders. Please try again.",
      );
    });
  });
});
