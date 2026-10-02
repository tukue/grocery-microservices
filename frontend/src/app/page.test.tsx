import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/shared", () => ({ createServerHttpClient: vi.fn(() => ({})) }));
vi.mock("@/features/products/api/products-api", () => ({
  createProductsApi: vi.fn(() => ({ list: vi.fn().mockResolvedValue([]) })),
}));

import Home from "./page";

describe("Home", () => {
  it("renders the home page with search field", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Ecommerce Store" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search products")).toBeInTheDocument();
  });

  it("shows welcome message initially", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Welcome! Start searching for products."),
    ).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Welcome! Start searching for products."),
    ).toBeInTheDocument();
  });

  it("shows no products found message for searched term", async () => {
    render(
      <MemoryRouter initialEntries={["/?search=nonexistent"]}>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByText(/no products found matching/i),
      ).toBeInTheDocument(),
    );
  });

  it("navigates to products page with search query", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "apple" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(window.location.pathname).toBe("/");
  });
});
