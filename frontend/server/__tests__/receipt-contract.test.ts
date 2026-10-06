// @vitest-environment node
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBff } from "../bff";
import { loadConfig } from "../config";
import { MemorySessionStore } from "../session-store";
const path = "/api/customer/ledger/orders/7/receipt";
afterEach(() => vi.unstubAllGlobals());
async function fixture() {
  const store = new MemorySessionStore();
  const session = await store.create({
    jwt: "owner-token",
    userId: "customer",
    email: "c@example.test",
    expiresAt: Date.now() + 60_000,
  });
  return {
    app: createBff(loadConfig({}), store),
    cookie: `grocery_session=${session.id}`,
  };
}
describe("receipt BFF boundary", () => {
  it("requires a session before contacting ledger", async () => {
    const { app } = await fixture();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await request(app).get(path).expect(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns validated plain receipt content and forwards the session token", async () => {
    const { app, cookie } = await fixture();
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("Grove receipt\nTotal: 12.00"));
    vi.stubGlobal("fetch", fetcher);
    const result = await request(app)
      .get(path)
      .set("Cookie", cookie)
      .expect(200);
    expect(result.body).toEqual({
      status: "ready",
      content: "Grove receipt\nTotal: 12.00",
    });
    expect(fetcher.mock.calls[0][1].headers.authorization).toBe(
      "Bearer owner-token",
    );
  });
  it("returns pending only after verifying the owned order", async () => {
    const { app, cookie } = await fixture();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 7, userId: "customer" })),
      );
    vi.stubGlobal("fetch", fetcher);
    await request(app)
      .get(path)
      .set("Cookie", cookie)
      .expect(202, { status: "pending" });
    expect(fetcher.mock.calls[1][0]).toContain("/api/customer/orders/7");
  });
  it.each([401, 403, 404, 503])(
    "preserves order verification failure %i instead of returning pending",
    async (status) => {
      const { app, cookie } = await fixture();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(new Response("{}", { status: 404 }))
          .mockResolvedValueOnce(new Response("{}", { status })),
      );
      await request(app).get(path).set("Cookie", cookie).expect(status);
    },
  );
  it("rejects an order belonging to another customer", async () => {
    const { app, cookie } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 7, userId: "other" })),
        ),
    );
    await request(app).get(path).set("Cookie", cookie).expect(403);
  });
  it("rejects invalid ownership responses", async () => {
    const { app, cookie } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 8, userId: "customer" })),
        ),
    );
    await request(app).get(path).set("Cookie", cookie).expect(502);
  });
  it("rejects an empty receipt", async () => {
    const { app, cookie } = await fixture();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("  ")));
    await request(app).get(path).set("Cookie", cookie).expect(502);
  });
  it("does not turn ledger outages into pending", async () => {
    const { app, cookie } = await fixture();
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    await request(app).get(path).set("Cookie", cookie).expect(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
