// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  loadConfig: vi.fn(() => ({
    redisUrl: "redis://localhost",
    sessionNamespace: "test",
  })),
  createBff: vi.fn(),
}));
vi.mock("../session-store.js", () => ({
  RedisSessionStore: { connect: mocks.connect },
}));
vi.mock("../config.js", () => ({ loadConfig: mocks.loadConfig }));
vi.mock("../bff.js", () => ({ createBff: mocks.createBff }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});
describe("deployment runtime", () => {
  it("shares initialization across concurrent and subsequent invocations", async () => {
    const sessions = { isOpen: () => true };
    const app = vi.fn();
    mocks.connect.mockResolvedValue(sessions);
    mocks.createBff.mockReturnValue(app);
    const { getRuntime } = await import("../runtime.js");
    const [first, second] = await Promise.all([getRuntime(), getRuntime()]);
    expect(first).toBe(second);
    expect(await getRuntime()).toBe(first);
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith(
      "redis://localhost",
      "test",
    );
    expect(first.app).toBe(app);
  });
  it("retries after an unavailable Redis connection", async () => {
    mocks.connect
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({ isOpen: () => true });
    const { getRuntime } = await import("../runtime.js");
    await expect(getRuntime()).rejects.toThrow("unavailable");
    await expect(getRuntime()).resolves.toBeDefined();
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
  it("closes Redis when constructing the application fails", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    mocks.connect.mockResolvedValue({ close, isOpen: () => true });
    mocks.createBff.mockImplementationOnce(() => {
      throw new Error("configuration");
    });
    const { getRuntime } = await import("../runtime.js");
    await expect(getRuntime()).rejects.toThrow("configuration");
    expect(close).toHaveBeenCalledOnce();
    await expect(getRuntime()).resolves.toBeDefined();
  });
  it("replaces an exhausted client once for concurrent warm invocations", async () => {
    let open = true;
    const firstSessions = { isOpen: () => open };
    const replacementSessions = { isOpen: () => true };
    mocks.connect
      .mockResolvedValueOnce(firstSessions)
      .mockResolvedValueOnce(replacementSessions);
    const { getRuntime } = await import("../runtime.js");
    const first = await getRuntime();
    open = false;
    const [next, concurrent] = await Promise.all([getRuntime(), getRuntime()]);
    expect(next).toBe(concurrent);
    expect(next).not.toBe(first);
    expect(next.sessions).toBe(replacementSessions);
    expect(await getRuntime()).toBe(next);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
