import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the home page with search field", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Ecommerce Store" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search products")).toBeInTheDocument();
  });

  it("shows welcome message initially", () => {
    render(<Home />);

    expect(screen.getByText("Welcome! Start searching for products.")).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    render(<Home />);

    expect(screen.getByText("Loading products...")).toBeInTheDocument();
  });

  it("shows no products found message for searched term", async () => {
    render(<Home />);

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(screen.getByText('No products found matching "nonexistent"')).toBeInTheDocument();
  });

  it("navigates to products page with search query", async () => {
    render(<Home />);

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "apple" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(window.location.pathname).toBe("/products?search=apple");
  });
});