const STORAGE_KEY = "checkout.idempotency-key";

function createIdempotencyKey(): string {
  try {
    return (
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function getOrCreateIdempotencyKey(): string {
  try {
    const existing = globalThis.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const key = createIdempotencyKey();
    globalThis.sessionStorage.setItem(STORAGE_KEY, key);
    return key;
  } catch {
    return createIdempotencyKey();
  }
}

export function clearIdempotencyKey(): void {
  try {
    globalThis.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}
