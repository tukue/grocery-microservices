import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchReceipt } from "./receipt-client";
afterEach(() => vi.unstubAllGlobals());
describe("receipt response validation", () => {
  it("accepts a pending response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"status":"pending"}', { status: 202 }),
        ),
    );
    expect(await fetchReceipt(7)).toEqual({ status: "pending" });
  });
  it("rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response('{"status":"ready","content":""}')),
    );
    await expect(fetchReceipt(7)).rejects.toThrow();
  });
  it("rejects unsafe identifiers before making a request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchReceipt(-1)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
