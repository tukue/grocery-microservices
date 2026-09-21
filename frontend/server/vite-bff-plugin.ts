import type { Plugin } from "vite";

import { SERVICE_URLS, resolveService } from "./proxy.js";

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

function sendJson(res: import("http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: import("http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
}

function setCookie(
  res: import("http").ServerResponse,
  name: string,
  value: string,
  opts: { httpOnly: boolean; secure: boolean; sameSite: string; path: string; maxAge: number },
) {
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function bffPlugin(): Plugin {
  return {
    name: "bff",
    configureServer(server) {
      server.middlewares.use("/api/auth/login", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }
        const body = await readBody(req);
        const username = body.username;
        const password = body.password;
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          username.length === 0 ||
          password.length === 0
        ) {
          sendJson(res, 400, { error: "Username and password are required" });
          return;
        }
        try {
          const response = await fetch(`${SERVICE_URLS.cart}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const data = (await response.json()) as { token?: string; error?: string };
          if (!response.ok) {
            sendJson(res, response.status, data);
            return;
          }
          if (!data.token) {
            sendJson(res, 502, { error: "Invalid auth response" });
            return;
          }
          setCookie(res, "session_token", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          });
          sendJson(res, 200, { user: { username }, type: "Bearer" });
        } catch {
          sendJson(res, 502, { error: "Auth service unavailable" });
        }
      });

      server.middlewares.use("/api/auth/logout", (_req, res) => {
        res.setHeader(
          "Set-Cookie",
          "session_token=; Path=/; Max-Age=0; SameSite=lax; HttpOnly",
        );
        sendJson(res, 200, { ok: true });
      });

      server.middlewares.use("/api/auth/me", (req, res) => {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.session_token;
        if (!token) {
          sendJson(res, 401, { error: "Not authenticated" });
          return;
        }
        try {
          const parts = token.split(".");
          if (parts.length !== 3) {
            sendJson(res, 401, { error: "Invalid session" });
            return;
          }
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString(),
          );
          sendJson(res, 200, {
            userId: payload.sub || payload.email,
            email: payload.email,
          });
        } catch {
          sendJson(res, 401, { error: "Invalid session" });
        }
      });

      // Dynamic proxy for all other /api/* routes
      server.middlewares.use("/api", async (req, res) => {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.session_token;
        const { target } = resolveService(req.url || "/");

        try {
          const url = new URL(req.url || "/", target);
          const headers: Record<string, string> = {
            "content-type": req.headers["content-type"] || "application/json",
          };
          if (token) headers.authorization = `Bearer ${token}`;

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);

          const upstream = await fetch(url.toString(), {
            method: req.method,
            headers,
            body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
          });

          res.writeHead(upstream.status, {
            "content-type": upstream.headers.get("content-type") || "application/json",
          });
          const responseBuf = Buffer.from(await upstream.arrayBuffer());
          res.end(responseBuf);
        } catch {
          sendJson(res, 502, { error: "Service unavailable" });
        }
      });
    },
  };
}
