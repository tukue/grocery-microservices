import { describe, it, expect } from "vitest";
import { checkoutFormSchema } from "../api/checkout-form-schema";

describe("checkoutFormSchema", () => {
  it("accepts empty values (all optional)", () => {
    const result = checkoutFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid idempotency key", () => {
    const result = checkoutFormSchema.safeParse({ idempotencyKey: "abc-123" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.idempotencyKey).toBe("abc-123");
  });

  it("accepts empty string as optional", () => {
    const result = checkoutFormSchema.safeParse({ idempotencyKey: "" });
    expect(result.success).toBe(true);
  });

  it("rejects idempotency key over 64 chars", () => {
    const longKey = "a".repeat(65);
    const result = checkoutFormSchema.safeParse({ idempotencyKey: longKey });
    expect(result.success).toBe(false);
  });

  it("accepts idempotency key at exactly 64 chars", () => {
    const key = "a".repeat(64);
    const result = checkoutFormSchema.safeParse({ idempotencyKey: key });
    expect(result.success).toBe(true);
  });

  it("rejects non-string idempotency key", () => {
    const result = checkoutFormSchema.safeParse({ idempotencyKey: 123 });
    expect(result.success).toBe(false);
  });
});
