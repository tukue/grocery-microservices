import { describe, expect, it } from "vitest";
import { SessionStore } from "../session-store";

describe("SessionStore", () => {
  const input = {
    email: "shopper@example.com",
    expiresAt: 2_000,
    jwt: "secret",
    userId: "shopper",
  };
  it("creates an opaque unique id and looks up an active session", () => {
    const store = new SessionStore();
    const first = store.create(input);
    const second = store.create(input);
    expect(first.id).not.toBe(second.id);
    expect(first.id).not.toContain(input.jwt);
    expect(store.get(first.id, 1_000)).toEqual(first);
  });
  it("expires and deletes sessions", () => {
    const store = new SessionStore();
    const session = store.create(input);
    expect(store.get(session.id, 2_000)).toBeNull();
    expect(store.delete(session.id)).toBe(false);
  });
  it("cleans up all expired records", () => {
    const store = new SessionStore();
    store.create(input);
    store.create({ ...input, expiresAt: 4_000 });
    expect(store.cleanup(3_000)).toBe(1);
  });
});
