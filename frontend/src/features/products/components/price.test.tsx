import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Price } from "./price";

describe("Price", () => {
  it("formats an amount using the supplied currency and locale", () => {
    render(<Price amount={29.9} currency="SEK" locale="sv-SE" />);

    expect(screen.getByLabelText(/29,90/)).toBeInTheDocument();
  });

  it("uses the runtime locale when no locale is supplied", () => {
    render(<Price amount={10} currency="USD" />);

    expect(screen.getByText(/10/)).toBeInTheDocument();
  });
});
