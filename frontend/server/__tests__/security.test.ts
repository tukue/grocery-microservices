// @vitest-environment node
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBff } from "../bff.js";
import { loadConfig } from "../config.js";
import { MemorySessionStore } from "../session-store.js";

afterEach(() => vi.unstubAllGlobals());
const config = {
  ...loadConfig({}),
  cookieSecure: true,
  publicOrigin: "https://shop.test",
};
describe("BFF security boundary", () => {
  it.each([undefined, "null", "https://evil.test"])(
    "rejects untrusted mutation origin %s before upstream calls",
    async (origin) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const req = request(createBff(config, new MemorySessionStore())).post(
        "/api/auth/logout",
      );
      if (origin) req.set("Origin", origin);
      await req.expect(403);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("allows trusted-origin logout and prevents caching customer data", async () => {
    const response = await request(createBff(config, new MemorySessionStore()))
      .post("/api/auth/logout")
      .set("Origin", "https://shop.test")
      .expect(204);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["set-cookie"][0]).toContain("Secure");
  });
  it("never exposes raw session failures", async () => {
    const sessions = new MemorySessionStore();
    vi.spyOn(sessions, "get").mockRejectedValue(
      new Error("redis://password@host"),
    );
    const result = await request(createBff(config, sessions))
      .get("/api/auth/me")
      .expect(503);
    expect(result.text).not.toContain("password");
    expect(result.body.correlationId).toBeTruthy();
  });
  it("rate limits sign-in and does not contact identity after the limit", async () => {
    const sessions = new MemorySessionStore();
    const app = createBff(loadConfig({}), sessions);
    for (let index = 0; index < 10; index++)
      await request(app).post("/api/auth/login").send({}).expect(400);
    const result = await request(app)
      .post("/api/auth/login")
      .send({})
      .expect(429);
    expect(result.headers["retry-after"]).toBe("60");
  });
  it("isolates Vercel sign-in budgets using platform client metadata", async () => {
    const app = createBff(
      loadConfig({ VERCEL: "1" }),
      new MemorySessionStore(),
    );
    for (let index = 0; index < 10; index++)
      await request(app)
        .post("/api/auth/login")
        .set("x-vercel-forwarded-for", "192.0.2.1")
        .send({})
        .expect(400);
    await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "192.0.2.1")
      .send({})
      .expect(429);
    await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "192.0.2.2")
      .send({})
      .expect(400);
  });
  it("ignores spoofed client metadata outside the Vercel runtime", async () => {
    const app = createBff(loadConfig({}), new MemorySessionStore());
    for (let index = 0; index < 10; index++)
      await request(app)
        .post("/api/auth/login")
        .set("x-vercel-forwarded-for", `192.0.2.${index + 1}`)
        .send({})
        .expect(400);
    await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "192.0.2.99")
      .send({})
      .expect(429);
  });
  it("requires sub and exp instead of falling back to email or a default lifetime", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ token: "token" })),
        ),
    );
    for (const claims of [
      { email: "customer@test", exp: Date.now() / 1000 + 60 },
      { sub: "customer", email: "customer@test" },
    ]) {
      await request(
        createBff(loadConfig({}), new MemorySessionStore(), async () => claims),
      )
        .post("/api/auth/login")
        .send({ username: "user", password: "password" })
        .expect(502);
    }
  });
  it("propagates safe correlation IDs through Gateway and never forwards browser authorization", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetcher);
    await request(createBff(loadConfig({}), new MemorySessionStore()))
      .get("/api/catalog/products?q=apple")
      .set("X-Correlation-Id", "safe-request-1")
      .set("Authorization", "Bearer malicious")
      .expect(200);
    expect(fetcher.mock.calls[0][0]).toBe(
      "http://localhost:8085/api/catalog/products?q=apple",
    );
    expect(fetcher.mock.calls[0][1].headers).toEqual({
      accept: "application/json",
      "x-correlation-id": "safe-request-1",
    });
  });
  it("returns JSON for the API root and unknown routes, never the SPA", async () => {
    const app = createBff(loadConfig({}), new MemorySessionStore());
    for (const path of ["/api", "/api/unknown"]) {
      const response = await request(app).get(path).expect(404);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.body.status).toBe(404);
    }
  });
  it("reports unready when Redis or Gateway is unavailable", async () => {
    const store = new MemorySessionStore();
    const app = createBff(loadConfig({}), store);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ status: "UP" })),
        ),
    );
    await request(app).get("/ready").expect(200);
    vi.spyOn(store, "ping").mockRejectedValue(new Error("offline"));
    await request(app).get("/ready").expect(503);
  });
});
