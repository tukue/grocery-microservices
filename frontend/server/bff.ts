import { z } from "zod";
import cookieParser from "cookie-parser";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { type BffConfig } from "./config.js";
import { resolveService } from "./proxy.js";
import { type SessionRecord, type SessionStore } from "./session-store.js";

import { createOidcClient, identityClaims, newLogin } from "./oidc.js";
import { loginLimiter, requestSecurity } from "./security.js";

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
        requiredClaims: ["sub", "exp"],
      })
    ).payload;
}

async function verifiedIdentity(token: string, verifyToken: TokenVerifier) {
  return identityClaims(await verifyToken(token));
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
    correlationId: res.locals.correlationId,
  });
}

export function createBff(
  config: BffConfig,
  sessions: SessionStore,
  verifyToken: TokenVerifier = createTokenVerifier(config),
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestSecurity(config));
  app.use(cookieParser());
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "4kb" }));
  app.get(["/health", "/api/health"], (_req, res) =>
    res.json({ status: "ok" }),
  );

  app.get(["/ready", "/api/ready"], async (_req, res) => {
    try {
      await sessions.ping();
      const target = config.gatewayUrl ?? config.serviceUrls.product;
      const upstream = await fetch(`${target}/actuator/health`, {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      const health = (await upstream.json()) as { status?: string };
      if (!upstream.ok || health.status !== "UP")
        throw new Error("Upstream unavailable");
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.get("/api/auth/config", (_req, res) =>
    res.json({ mode: config.auth?.mode ?? "demo" }),
  );
  const rateLimit = loginLimiter(sessions, config);
  const oidc =
    config.auth?.mode === "oidc"
      ? createOidcClient(config, config.auth.oidc)
      : null;
  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: config.cookieSecure,
  };
  app.post("/api/auth/oidc/start", rateLimit, async (req, res) => {
    if (!oidc) {
      sendError(res, 404, "Sign-in method unavailable", req.path);
      return;
    }
    try {
      const transaction = newLogin(req.body?.returnTo);
      const url = await oidc.authorizationUrl(transaction);
      const id = await sessions.saveLogin(transaction);
      res.cookie("grocery_login", id, { ...cookieOptions, maxAge: 600_000 });
      res.redirect(303, url);
    } catch {
      sendError(res, 502, "Sign-in service unavailable", req.path);
    }
  });
  app.get("/api/auth/callback", async (req, res) => {
    res.clearCookie("grocery_login", cookieOptions);
    if (!oidc) {
      sendError(res, 404, "Sign-in method unavailable", req.path);
      return;
    }
    try {
      const transaction = await sessions.takeLogin(
        req.cookies.grocery_login ?? "",
      );
      if (
        !transaction ||
        typeof req.query.state !== "string" ||
        req.query.state !== transaction.state ||
        typeof req.query.code !== "string" ||
        !req.query.code ||
        req.query.error
      )
        throw new Error("Invalid callback");
      const input = await oidc.exchange(
        req.query.code,
        transaction,
        verifyToken,
      );
      const session = await sessions.create(input);
      await sessions.delete(req.cookies[COOKIE_NAME]);
      await sessions.delete(req.cookies[COOKIE_NAME]);
      res.cookie(COOKIE_NAME, session.id, {
        ...cookieOptions,
        maxAge: Math.max(0, session.expiresAt - Date.now()),
      });
      res.redirect(303, transaction.returnTo);
    } catch {
      res.redirect(303, "/login?error=signin");
    }
  });
  app.post("/api/auth/login", rateLimit, async (req, res) => {
    if (oidc || config.cookieSecure) {
      sendError(res, 404, "Password sign-in is disabled", req.path);
      return;
    }
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
      const upstream = await fetch(
        `${config.auth?.mode === "demo" ? config.auth.demoIdentityUrl : config.serviceUrls.cart}/auth/login`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
          signal: AbortSignal.timeout(TIMEOUT),
          redirect: "error",
        },
      );
      const body = (await upstream.json().catch(() => ({}))) as {
        token?: unknown;
      };
      if (!upstream.ok) {
        sendError(
          res,
          upstream.status === 401 || upstream.status === 403 ? 401 : 502,
          "Sign-in failed",
          req.path,
        );
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
      config.gatewayUrl,
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
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-correlation-id": res.locals.correlationId,
    };
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
          redirect: "error",
        },
      );
      const receiptMatch = req.path.match(
        /^\/api\/customer\/ledger\/orders\/(\d+)\/receipt$/,
      );
      if (receiptMatch && upstream.status === 404) {
        const owned = await fetch(
          `${config.serviceUrls.order}/api/customer/orders/${receiptMatch[1]}`,
          { headers, signal: AbortSignal.timeout(TIMEOUT), redirect: "error" },
        );
        if (!owned.ok) {
          sendError(
            res,
            owned.status,
            owned.status === 401
              ? "Please sign in to continue"
              : owned.status === 403
                ? "Access denied"
                : owned.status === 404
                  ? "Order not found"
                  : "Order service unavailable",
            req.path,
          );
          return;
        }
        const order = z
          .object({
            id: z.number().int().positive(),
            userId: z.string().min(1),
          })
          .safeParse(await owned.json());
        if (!order.success || order.data.id !== Number(receiptMatch[1])) {
          sendError(
            res,
            502,
            "Order service returned an invalid response",
            req.path,
          );
          return;
        }
        if (order.data.userId !== session?.userId) {
          sendError(res, 403, "Access denied", req.path);
          return;
        }
        res.status(202).json({ status: "pending" });
        return;
      }
      if (receiptMatch && upstream.ok) {
        const content = await upstream.text();
        if (!content.trim()) {
          sendError(
            res,
            502,
            "Receipt service returned an invalid response",
            req.path,
          );
          return;
        }
        res.json({ status: "ready", content });
        return;
      }
      res
        .status(upstream.status)
        .type(upstream.headers.get("content-type") ?? "application/json")
        .send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      sendError(res, 502, "Service unavailable", req.path);
    }
  });
  app.use("/api", (req, res) =>
    sendError(res, 404, "Route not found", req.originalUrl),
  );
  app.use(
    (error: unknown, req: Request, res: Response, _next: NextFunction) => {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 413
          ? 413
          : error instanceof SyntaxError
            ? 400
            : 503;
      sendError(
        res,
        status,
        status === 413
          ? "Request is too large"
          : status === 400
            ? "Invalid request"
            : "Service unavailable",
        req.path,
      );
    },
  );
  return app;
}
