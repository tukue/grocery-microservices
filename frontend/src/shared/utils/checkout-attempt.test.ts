import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCheckoutAttempt,
  getOrCreateCheckoutAttempt,
  replaceCheckoutAttempt,
  setCheckoutAttemptState,
} from "./checkout-attempt";
beforeEach(() => sessionStorage.clear());
describe("checkout attempts", () => {
  it("reuses a cart-scoped key and tracks ambiguous state", () => {
    const first = getOrCreateCheckoutAttempt(1);
    expect(first.idempotencyKey.length).toBeLessThanOrEqual(64);
    expect(getOrCreateCheckoutAttempt(1).idempotencyKey).toBe(
      first.idempotencyKey,
    );
    expect(setCheckoutAttemptState(1, "AMBIGUOUS").state).toBe("AMBIGUOUS");
  });
  it("replaces definitive failures and clears success", () => {
    const first = getOrCreateCheckoutAttempt(1);
    expect(replaceCheckoutAttempt(1).idempotencyKey).not.toBe(
      first.idempotencyKey,
    );
    clearCheckoutAttempt(1);
    expect(sessionStorage.length).toBe(0);
  });
});
