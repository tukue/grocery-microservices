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
  it("replaces corrupt or invalid stored attempts", () => {
    sessionStorage.setItem("checkout.attempt.1", "not-json");
    expect(getOrCreateCheckoutAttempt(1)).toMatchObject({
      cartId: 1,
      state: "READY",
    });
    sessionStorage.setItem(
      "checkout.attempt.2",
      JSON.stringify({ cartId: 99, idempotencyKey: "forged", state: "READY" }),
    );
    expect(getOrCreateCheckoutAttempt(2).idempotencyKey).not.toBe("forged");
  });
});
