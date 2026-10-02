import { render, screen, fireEvent } from "@testing-library/react";
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

    expect(screen.getByText("Loading products...")).toBeInTheDocument();
  });

  it("shows no products found message for searched term", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(
      screen.getByText('No products found matching "nonexistent"'),
    ).toBeInTheDocument();
  });

  it("navigates to products page with search query", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "apple" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(window.location.pathname).toBe("/products?search=apple");
  });
});
