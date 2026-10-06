import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ReceiptPanel } from "./receipt-panel";
import { ReceiptError } from "../api/receipt-client";

describe("receipt lifecycle", () => {
  it("polls a pending receipt until ready", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValue({ status: "ready", content: "Receipt for order 7" });
    render(
      <MemoryRouter>
        <ReceiptPanel orderId={7} loadReceipt={load} initialDelay={5} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Receipt for order 7")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("stops after the wait budget and supports explicit retry", async () => {
    const load = vi.fn().mockResolvedValue({ status: "pending" });
    render(
      <MemoryRouter>
        <ReceiptPanel orderId={7} loadReceipt={load} waitBudget={0} />
      </MemoryRouter>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Check receipt again" }),
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
  it("does not retry forbidden responses", async () => {
    const load = vi.fn().mockRejectedValue(new ReceiptError(403));
    render(
      <MemoryRouter>
        <ReceiptPanel orderId={7} loadReceipt={load} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("access");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("aborts in-flight requests when leaving the page", async () => {
    const load = vi.fn().mockImplementation(() => new Promise(() => {}));
    const view = render(
      <MemoryRouter>
        <ReceiptPanel orderId={7} loadReceipt={load} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(load).toHaveBeenCalled());
    view.unmount();
    expect(load.mock.calls[0][1].aborted).toBe(true);
  });
});
