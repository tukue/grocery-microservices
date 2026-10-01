import cookieParser from "cookie-parser";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { pathToFileURL } from "node:url";
import { loadConfig, type BffConfig } from "./config.js";
import { resolveService } from "./proxy.js";
import {
  RedisSessionStore,
  type SessionRecord,
  type SessionStore,
} from "./session-store.js";

const COOKIE_NAME = "grocery_session";
const TIMEOUT = 8_000;
export type TokenVerifier = (token: string) => Promise<JWTPayload>;

export function createTokenVerifier(config: BffConfig): TokenVerifier {
  const jwks = createRemoteJWKSet(new URL(config.jwt.jwksUri));
  return async (token) =>
    (
      await jwtVerify(token, jwks, {
        algorithms: ["RS256"],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
      })
    ).payload;
}

async function verifiedIdentity(token: string, verifyToken: TokenVerifier) {
  const payload = await verifyToken(token);
  const email = typeof payload.email === "string" ? payload.email : "";
  const userId = typeof payload.sub === "string" ? payload.sub : email;
  const expiresAt =
    typeof payload.exp === "number"
      ? payload.exp * 1000
      : Date.now() + 3_600_000;
  if (!email || !userId || expiresAt <= Date.now())
    throw new Error("Invalid identity claims");
  return { email, expiresAt, userId };
}
function publicSession(session: SessionRecord) {
  return { email: session.email, userId: session.userId };
}
function sendError(
  res: Response,
  status: number,
  message: string,
  path?: string,
) {
  res.status(status).json({
    error: status >= 500 ? "Bad Gateway" : "Request Failed",
    message,
    path,
    status,
  });
}

export function createBff(
  config: BffConfig,
  sessions: SessionStore,
  verifyToken: TokenVerifier = createTokenVerifier(config),
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json({ limit: "64kb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      sendError(res, 400, "Username and password are required", req.path);
      return;
    }
    try {
      const upstream = await fetch(`${config.serviceUrls.cart}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      const body = (await upstream.json().catch(() => ({}))) as {
        token?: unknown;
      };
      if (!upstream.ok) {
        res.status(upstream.status).json(body);
        return;
      }
      if (typeof body.token !== "string") {
        sendError(
          res,
          502,
          "Identity service returned an invalid response",
          req.path,
        );
        return;
      }
      const session = await sessions.create({
        ...(await verifiedIdentity(body.token, verifyToken)),
        jwt: body.token,
      });
      res.cookie(COOKIE_NAME, session.id, {
        httpOnly: true,
        maxAge: Math.max(0, session.expiresAt - Date.now()),
        path: "/",
        sameSite: "lax",
        secure: config.cookieSecure,
      });
      res.json(publicSession(session));
    } catch {
      sendError(res, 502, "Authentication service unavailable", req.path);
    }
  });
  app.post("/api/auth/logout", async (req, res) => {
    await sessions.delete(req.cookies[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: config.cookieSecure,
    });
    res.status(204).end();
  });
  app.get("/api/auth/me", async (req, res) => {
    const session = await sessions.get(req.cookies[COOKIE_NAME]);
    if (!session) {
      sendError(res, 401, "Not authenticated", req.path);
      return;
    }
    res.json(publicSession(session));
  });
  app.all("/api/*splat", async (req, res) => {
    const route = resolveService(
      req.method,
      req.originalUrl,
      config.serviceUrls,
    );
    if (!route) {
      sendError(res, 404, "Route not found", req.path);
      return;
    }
    const session = await sessions.get(req.cookies[COOKIE_NAME]);
    if (route.protected && !session) {
      sendError(res, 401, "Not authenticated", req.path);
      return;
    }
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
    const headers: Record<string, string> = { accept: "application/json" };
    if (req.is("application/json"))
      headers["content-type"] = "application/json";
    if (session) headers.authorization = `Bearer ${session.jwt}`;
    if (
      req.path === "/api/customer/checkout" &&
      typeof req.body?.idempotencyKey === "string"
    )
      headers["idempotency-key"] = req.body.idempotencyKey;
    try {
      const upstream = await fetch(
        `${route.target}${route.upstreamPath}${query}`,
        {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method)
            ? undefined
            : JSON.stringify(req.body ?? {}),
          signal: AbortSignal.timeout(TIMEOUT),
        },
      );
      res
        .status(upstream.status)
        .type(upstream.headers.get("content-type") ?? "application/json")
        .send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      sendError(res, 502, "Service unavailable", req.path);
    }
  });
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) =>
    sendError(
      res,
      400,
      error instanceof Error ? error.message : "Invalid request",
      req.path,
    ),
  );
  return app;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const config = loadConfig();
  if (!config.redisUrl)
    throw new Error("REDIS_URL is required for the BFF session store");
  const sessions = await RedisSessionStore.connect(config.redisUrl);
  createBff(config, sessions).listen(config.port, () =>
    // The startup message is operational output for the standalone process.
    // eslint-disable-next-line no-console
    console.log(`Grocery BFF listening on http://localhost:${config.port}`),
  );
}
