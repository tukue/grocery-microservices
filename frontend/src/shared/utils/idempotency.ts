const STORAGE_KEY = "checkout.idempotency-key";

export function getOrCreateIdempotencyKey(): string {
  const existing = sessionStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const key = crypto.randomUUID();
  sessionStorage.setItem(STORAGE_KEY, key);
  return key;
}

export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
