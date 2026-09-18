import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "./product-card";

describe("ProductCard", () => {
  it("renders product details and availability", () => {
    render(<ProductCard product={{ available: true, id: 1, name: "Apples", price: 29.9 }} />);

    expect(screen.getByRole("heading", { name: "Apples" })).toBeInTheDocument();
    expect(screen.getByText("Description not provided.")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No image available for Apples" })).toBeInTheDocument();
  });

  it("announces unavailable products", () => {
    render(<ProductCard product={{ available: false, id: 1, name: "Apples", price: 29.9 }} />);

    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });
});
