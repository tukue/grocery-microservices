import { describe, expect, it } from "vitest";

import { createApplicationError } from "./application-error";

describe("createApplicationError", () => {
  it("preserves validation errors with a safe customer message", () => {
    const error = createApplicationError("validation", {
      name: "Product name must not be blank",
    });

    expect(error.kind).toBe("validation");
    expect(error.validationErrors).toEqual({
      name: "Product name must not be blank",
    });
    expect(error.customerMessage).toBe("Please review the highlighted fields.");
  });

  it("uses generic messages for unexpected failures", () => {
    const error = createApplicationError("unexpected");

    expect(error.message).toBe("Something went wrong. Please try again.");
    expect(error.customerMessage).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
