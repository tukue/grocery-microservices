import { createApplicationError } from "@/shared/errors/application-error";

export function checkoutErrorForStatus(status: number) {
  if (status === 400 || status === 422) {
    return createApplicationError(
      "validation",
      undefined,
      "Please check your cart items.",
    );
  }
  if (status === 401) {
    return createApplicationError(
      "unauthorized",
      undefined,
      "Session expired. Please sign in again.",
    );
  }
  if (status === 403) {
    return createApplicationError(
      "unauthorized",
      undefined,
      "You don't have permission for this cart.",
    );
  }
  if (status === 404) {
    return createApplicationError("not-found", undefined, "Cart not found.");
  }
  if (status === 409) {
    return createApplicationError(
      "validation",
      undefined,
      "Cart was modified. Please review and try again.",
    );
  }
  if (status === 503) {
    return createApplicationError(
      "service-unavailable",
      undefined,
      "Service temporarily unavailable. Please try again.",
    );
  }

  return createApplicationError("unexpected");
}
