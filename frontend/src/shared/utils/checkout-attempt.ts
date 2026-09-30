export type CheckoutAttemptState =
  "READY" | "SUBMITTING" | "AMBIGUOUS" | "SUCCEEDED" | "FAILED";
export interface CheckoutAttempt {
  cartId: number;
  idempotencyKey: string;
  state: CheckoutAttemptState;
}
const keyFor = (cartId: number) => `checkout.attempt.${cartId}`;
function generate() {
  return globalThis.crypto.randomUUID();
}
export function getOrCreateCheckoutAttempt(cartId: number): CheckoutAttempt {
  const stored = sessionStorage.getItem(keyFor(cartId));
  if (stored) return JSON.parse(stored) as CheckoutAttempt;
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
