// @vitest-environment node
import { createServer, type Server } from "node:http";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBff } from "../bff.js";
import { loadConfig } from "../config.js";
import { safeReturnTo } from "../oidc.js";
import { MemorySessionStore } from "../session-store.js";

let server: Server;
let issuer: string;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let nonce = "";
let badNonce = false;
let exchanged = 0;
let verifier = "";
beforeAll(async () => {
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  const publicKey = await exportJWK(keys.publicKey);
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/.well-known/openid-configuration")
      res.end(
        JSON.stringify({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
        }),
      );
    else if (req.url === "/jwks")
      res.end(
        JSON.stringify({
          keys: [{ ...publicKey, kid: "test-key", alg: "RS256", use: "sig" }],
        }),
      );
    else if (req.url === "/token") {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        verifier = new URLSearchParams(body).get("code_verifier") ?? "";
        exchanged++;
        void (async () => {
          const access = await new SignJWT({ email: "customer@example.test" })
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer(issuer)
            .setSubject("customer-1")
            .setAudience("grocery-api")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey);
          const id = await new SignJWT({
            email: "customer@example.test",
            nonce: badNonce ? "wrong" : nonce,
          })
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer(issuer)
            .setSubject("customer-1")
            .setAudience("storefront")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey);
          res.end(
            JSON.stringify({
              access_token: access,
              id_token: id,
              token_type: "Bearer",
            }),
          );
        })().catch(() => {
          res.statusCode = 500;
          res.end("{}");
        });
      });
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing server port");
  issuer = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
function fixture() {
  return createBff(
    loadConfig({
      AUTH_MODE: "oidc",
      OIDC_CLIENT_ID: "storefront",
      OIDC_REDIRECT_URI: "http://localhost:5173/api/auth/callback",
      JWT_ISSUER_URI: issuer,
      JWT_JWKS_URI: `${issuer}/jwks`,
    }),
    new MemorySessionStore(),
  );
}
async function start(app: ReturnType<typeof createBff>) {
  const result = await request(app)
    .post("/api/auth/oidc/start")
    .set("Origin", "http://localhost:5173")
    .type("form")
    .send({ returnTo: "/cart" })
    .expect(303);
  const authorization = new URL(result.headers.location);
  nonce = authorization.searchParams.get("nonce")!;
  return {
    result,
    authorization,
    cookie: result.headers["set-cookie"][0].split(";", 1)[0],
  };
}
describe("OIDC authorization-code flow", () => {
  it("verifies real signed tokens, uses PKCE and stores only an opaque cookie", async () => {
    badNonce = false;
    const app = fixture();
    const login = await start(app);
    expect(login.authorization.searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    expect(login.authorization.searchParams.get("code_challenge")).toHaveLength(
      43,
    );
    const result = await request(app)
      .get(
        `/api/auth/callback?state=${login.authorization.searchParams.get("state")}&code=provider-code`,
      )
      .set("Cookie", login.cookie)
      .expect(303);
    expect(result.headers.location).toBe("/cart");
    expect(verifier).toHaveLength(43);
    const sessionCookie = (
      result.headers["set-cookie"] as unknown as string[]
    ).find((cookie: string) => cookie.startsWith("grocery_session="))!;
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie.split(";", 1)[0])
      .expect(200);
    expect(me.body).toEqual({
      userId: "customer-1",
      email: "customer@example.test",
    });
    expect(me.body).not.toHaveProperty("jwt");
    const count = exchanged;
    await request(app)
      .get(
        `/api/auth/callback?state=${login.authorization.searchParams.get("state")}&code=provider-code`,
      )
      .set("Cookie", login.cookie)
      .expect(303)
      .expect("Location", "/login?error=signin");
    expect(exchanged).toBe(count);
  });
  it("rejects state mismatch before token exchange", async () => {
    const app = fixture();
    const login = await start(app);
    const count = exchanged;
    await request(app)
      .get("/api/auth/callback?state=wrong&code=code")
      .set("Cookie", login.cookie)
      .expect("Location", "/login?error=signin");
    expect(exchanged).toBe(count);
  });
  it("rejects a nonce mismatch without issuing a session", async () => {
    badNonce = true;
    const app = fixture();
    const login = await start(app);
    const result = await request(app)
      .get(
        `/api/auth/callback?state=${login.authorization.searchParams.get("state")}&code=code`,
      )
      .set("Cookie", login.cookie)
      .expect("Location", "/login?error=signin");
    expect(
      (result.headers["set-cookie"] as unknown as string[]).some(
        (cookie: string) => cookie.startsWith("grocery_session="),
      ),
    ).toBe(false);
    badNonce = false;
  });
  it.each([
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "/api/auth/callback",
    "/login",
    "/\n/evil.test",
  ])("rejects unsafe return destination %s", (path) => {
    expect(safeReturnTo(path)).toBe("/products");
  });
  it("keeps safe internal return destinations", () =>
    expect(safeReturnTo("/products?q=apple")).toBe("/products?q=apple"));
});
