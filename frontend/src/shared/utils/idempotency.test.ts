import { beforeEach, describe, expect, it } from "vitest";

import { clearIdempotencyKey, getOrCreateIdempotencyKey } from "./idempotency";

describe("idempotency key storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates one key and reuses it for retries", () => {
    const first = getOrCreateIdempotencyKey();

    expect(first).toEqual(expect.any(String));
    expect(getOrCreateIdempotencyKey()).toBe(first);
  });

  it("clears the key after successful checkout", () => {
    getOrCreateIdempotencyKey();

    clearIdempotencyKey();

    expect(sessionStorage.getItem("checkout.idempotency-key")).toBeNull();
  });
});
