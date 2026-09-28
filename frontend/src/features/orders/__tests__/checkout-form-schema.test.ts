import { checkoutFormSchema } from "../api/checkout-form-schema";
import { describe, expect, it } from "vitest";

describe("checkoutFormSchema", () => {
  it("accepts empty values (all optional)", () => {
    const result = checkoutFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("does not accept browser-supplied idempotency fields", () => {
    const result = checkoutFormSchema.safeParse({ idempotencyKey: "abc-123" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({});
  });
});
