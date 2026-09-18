import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductGrid } from "./product-grid";

describe("ProductGrid", () => {
  it("renders a product collection", () => {
    render(<ProductGrid products={[{ available: true, id: 1, name: "Apples", price: 29.9 }]} />);

    expect(screen.getByRole("region", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Apples" })).toBeInTheDocument();
  });

  it("renders a clear empty state", () => {
    render(<ProductGrid products={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent("No products match your search.");
  });
});
