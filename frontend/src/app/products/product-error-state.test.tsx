import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductErrorState } from "./product-error-state";

describe("ProductErrorState", () => {
  it("retries without exposing backend details", () => {
    const retry = vi.fn();
    render(<ProductErrorState onRetry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText("We could not load the catalogue. Please try again.")).toBeInTheDocument();
  });
});
