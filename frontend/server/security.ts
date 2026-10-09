import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { RequestHandler } from "express";
import type { BffConfig } from "./config.js";
import type { SessionStore } from "./session-store.js";

export function requestSecurity(config: BffConfig): RequestHandler {
  return (req, res, next) => {
    // Only accept bounded, printable correlation identifiers; never log URLs,
    // cookies, bodies, credentials, or raw error objects.
    const incoming = req.get("x-correlation-id");
    const id =
      incoming && /^[a-zA-Z0-9_-]{1,64}$/.test(incoming)
        ? incoming
        : randomUUID();
    res.locals.correlationId = id;
    res.set({
      "X-Correlation-Id": id,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    });
    if (!req.path.startsWith("/api/")) return next();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const source = req.get("origin");
      const trusted = config.publicOrigin ?? "http://localhost:5173";
      // In production, missing/null origins are rejected rather than inferred
      // from attacker-controlled Host or forwarding headers.
      if (
        (source && source !== trusted) ||
        (!source && config.cookieSecure) ||
        req.get("sec-fetch-site") === "cross-site"
      ) {
        res.status(403).json({
          status: 403,
          message: "Request origin is not allowed",
          correlationId: id,
        });
        return;
      }
    }
    next();
  };
}
export function loginLimiter(
  sessions: SessionStore,
  config: BffConfig,
): RequestHandler {
  return async (req, res, next) => {
    // Vercel overwrites x-vercel-forwarded-for with platform-observed client
    // metadata. Trust it only when the platform supplies VERCEL=1, never in a
    // standalone deployment. Other forwarding headers are always ignored.
    const forwarded = config.vercelClientIp
      ? req.get("x-vercel-forwarded-for")?.split(",", 1)[0].trim()
      : undefined;
    const address =
      forwarded && isIP(forwarded)
        ? forwarded
        : (req.socket.remoteAddress ?? "unknown");
    const key = createHash("sha256").update(address).digest("hex");
    try {
      if (!(await sessions.allowLogin(key))) {
        res.set("Retry-After", "60").status(429).json({
          status: 429,
          message: "Too many sign-in attempts. Please try again shortly.",
        });
        return;
      }
      next();
    } catch {
      next(new Error("Session service unavailable"));
    }
  };
}
