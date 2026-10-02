import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderHistory } from "./order-history";
const line = {
  productId: 3,
  productName: "Apple",
  unitPrice: 1,
  quantity: 2,
  lineTotal: 2,
};
const order = (id: number, date: string) => ({
  id,
  userId: "u",
  cartId: id,
  status: "PENDING",
  orderDate: date,
  total: 2,
  orderLines: [line],
});
afterEach(() => vi.unstubAllGlobals());
describe("OrderHistory", () => {
  it("renders newest first with details links", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify([
              order(1, "2026-01-01T10:00:00"),
              order(2, "2026-02-01T10:00:00"),
            ]),
            { status: 200 },
          ),
        ),
    );
    render(
      <MemoryRouter>
        <OrderHistory />
      </MemoryRouter>,
    );
    const links = await screen.findAllByRole("link");
    expect(links[0]).toHaveTextContent("2");
    expect(screen.getAllByText("2.00")).toHaveLength(2);
  });
  it("shows an empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("[]", { status: 200 })),
    );
    render(
      <MemoryRouter>
        <OrderHistory />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no orders/i)).toBeInTheDocument();
  });
});
