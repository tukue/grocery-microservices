import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearIdempotencyKey, getOrCreateIdempotencyKey } from "./idempotency";

describe("idempotency key storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it("uses a fallback when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(getOrCreateIdempotencyKey()).toEqual(expect.any(String));
  });

  it("continues checkout when session storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(getOrCreateIdempotencyKey()).toEqual(expect.any(String));
  });

  it("continues checkout when session storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(getOrCreateIdempotencyKey()).toEqual(expect.any(String));
  });

  it("does not throw when session storage cannot be cleared", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() => clearIdempotencyKey()).not.toThrow();
  });
});
