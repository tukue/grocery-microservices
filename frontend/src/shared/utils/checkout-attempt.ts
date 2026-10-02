export type CheckoutAttemptState =
  "READY" | "SUBMITTING" | "AMBIGUOUS" | "SUCCEEDED" | "FAILED";
export interface CheckoutAttempt {
  cartId: number;
  idempotencyKey: string;
  state: CheckoutAttemptState;
}
const keyFor = (cartId: number) => `checkout.attempt.${cartId}`;
const states: CheckoutAttemptState[] = [
  "READY",
  "SUBMITTING",
  "AMBIGUOUS",
  "SUCCEEDED",
  "FAILED",
];
function generate() {
  return globalThis.crypto.randomUUID();
}
export function getOrCreateCheckoutAttempt(cartId: number): CheckoutAttempt {
  const stored = sessionStorage.getItem(keyFor(cartId));
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<CheckoutAttempt>;
      if (
        parsed.cartId === cartId &&
        typeof parsed.idempotencyKey === "string" &&
        parsed.idempotencyKey.length > 0 &&
        parsed.idempotencyKey.length <= 64 &&
        typeof parsed.state === "string" &&
        states.includes(parsed.state as CheckoutAttemptState)
      )
        return parsed as CheckoutAttempt;
    } catch {
      // Corrupt browser state is discarded below and replaced safely.
    }
    sessionStorage.removeItem(keyFor(cartId));
  }
  const attempt = {
    cartId,
    idempotencyKey: generate(),
    state: "READY" as const,
  };
  sessionStorage.setItem(keyFor(cartId), JSON.stringify(attempt));
  return attempt;
}
export function setCheckoutAttemptState(
  cartId: number,
  state: CheckoutAttemptState,
): CheckoutAttempt {
  const attempt = { ...getOrCreateCheckoutAttempt(cartId), state };
  sessionStorage.setItem(keyFor(cartId), JSON.stringify(attempt));
  return attempt;
}
export function clearCheckoutAttempt(cartId: number) {
  sessionStorage.removeItem(keyFor(cartId));
}
export function replaceCheckoutAttempt(cartId: number) {
  clearCheckoutAttempt(cartId);
  return getOrCreateCheckoutAttempt(cartId);
}
