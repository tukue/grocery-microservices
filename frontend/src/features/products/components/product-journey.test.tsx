import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductList } from "./product-list";

const product = {
  id: 1,
  name: "Apple",
  description: "Fresh",
  price: 1,
  currency: "SEK",
  available: true,
};
afterEach(() => vi.unstubAllGlobals());
describe("product journey", () => {
  it("renders products and debounces search", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify([product]), { status: 200 }),
        ),
    );
    render(
      <MemoryRouter initialEntries={["/products"]}>
        <ProductList />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Apple")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "red");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2), {
      timeout: 800,
    });
  });
  it("shows empty and error states", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("[]", { status: 200 })),
    );
    const { unmount } = render(
      <MemoryRouter>
        <ProductList />
      </MemoryRouter>,
    );
    expect(await screen.findByText("No products found.")).toBeInTheDocument();
    unmount();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(
      <MemoryRouter>
        <ProductList />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not load",
    );
  });
});
