import cookieParser from "cookie-parser";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { resolveService } from "./proxy";

const app = express();
const PORT = Number(process.env.BFF_PORT) || 3000;

app.use(cookieParser());
app.use(express.json());

// Auth routes — BFF handles session cookies
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const response = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }
    res.cookie("session_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600_000,
    });
    res.json({ user: { username }, type: "Bearer" });
  } catch {
    res.status(502).json({ error: "Auth service unavailable" });
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("session_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.session_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    res.json({ userId: payload.sub || payload.email, email: payload.email });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

// Dynamic proxy — routes /api/* to the correct backend service
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    next();
    return;
  }
  const { target } = resolveService(req.originalUrl);
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq) => {
        const token = req.cookies?.session_token;
        if (token) {
          proxyReq.setHeader("Authorization", `Bearer ${token}`);
        }
      },
    },
  });
  proxy(req, res, next);
});

// Catalogue routes (public, no auth) — proxied to product-service
app.use(
  "/api/catalog",
  createProxyMiddleware({
    target: "http://localhost:8083",
    changeOrigin: true,
    pathRewrite: { "^/api/catalog": "" },
  }),
);

app.listen(PORT, () => {
  console.log(`BFF running on http://localhost:${PORT}`);
});
