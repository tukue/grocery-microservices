import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";
import type { BffConfig, OidcConfig } from "./config.js";
import type { LoginTransaction } from "./session-store.js";

const TIMEOUT = 8000;
const discoverySchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
});
const tokenSchema = z.object({
  access_token: z.string().min(1),
  id_token: z.string().min(1),
  token_type: z.string().refine((value) => value.toLowerCase() === "bearer"),
});
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/products";
  const url = new URL(value, "https://store.invalid");
  if (
    url.origin !== "https://store.invalid" ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/login"
  )
    return "/products";
  return url.pathname + url.search + url.hash;
}
function opaque() {
  return randomBytes(32).toString("base64url");
}
export function newLogin(returnTo: unknown): LoginTransaction {
  return {
    state: opaque(),
    nonce: opaque(),
    verifier: opaque(),
    returnTo: safeReturnTo(returnTo),
    expiresAt: Date.now() + 600_000,
  };
}
export function identityClaims(payload: JWTPayload, email?: string) {
  const userId = payload.sub;
  const expiresAt =
    typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : 0;
  const identityEmail = email ?? payload.email;
  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    typeof identityEmail !== "string" ||
    !identityEmail.trim() ||
    expiresAt <= Date.now()
  )
    throw new Error("Invalid identity claims");
  return { userId, email: identityEmail, expiresAt };
}
export function createOidcClient(config: BffConfig, oidc: OidcConfig) {
  let discovery: Promise<z.infer<typeof discoverySchema>> | undefined;
  const metadata = () => {
    discovery ??= (async () => {
      const response = await fetch(
        `${config.jwt.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
        { signal: AbortSignal.timeout(TIMEOUT), redirect: "error" },
      );
      if (!response.ok) throw new Error("Identity discovery unavailable");
      const doc = discoverySchema.parse(await response.json());
      if (doc.issuer !== config.jwt.issuer)
        throw new Error("Identity issuer mismatch");
      for (const endpoint of [
        doc.authorization_endpoint,
        doc.token_endpoint,
        doc.jwks_uri,
      ]) {
        const url = new URL(endpoint);
        if (
          url.username ||
          url.password ||
          url.hash ||
          !["https:", ...(config.cookieSecure ? [] : ["http:"])].includes(
            url.protocol,
          )
        )
          throw new Error("Invalid identity endpoint");
      }
      return doc;
    })().catch((error: unknown) => {
      discovery = undefined;
      throw error;
    });
    return discovery;
  };
  return {
    async authorizationUrl(login: LoginTransaction) {
      const doc = await metadata();
      const url = new URL(doc.authorization_endpoint);
      const params = {
        client_id: oidc.clientId,
        redirect_uri: oidc.redirectUri,
        response_type: "code",
        scope: "openid email",
        state: login.state,
        nonce: login.nonce,
        code_challenge_method: "S256",
        code_challenge: createHash("sha256")
          .update(login.verifier)
          .digest("base64url"),
      };
      for (const [key, value] of Object.entries(params))
        url.searchParams.set(key, value);
      return url.toString();
    },
    async exchange(
      code: string,
      login: LoginTransaction,
      verifyAccess: (token: string) => Promise<JWTPayload>,
    ) {
      const doc = await metadata();
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: oidc.redirectUri,
        client_id: oidc.clientId,
        code_verifier: login.verifier,
      });
      const headers: Record<string, string> = {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      };
      if (oidc.clientSecret) {
        const encode = (value: string) =>
          new URLSearchParams({ v: value }).toString().slice(2);
        headers.authorization = `Basic ${Buffer.from(`${encode(oidc.clientId)}:${encode(oidc.clientSecret)}`).toString("base64")}`;
      }
      const response = await fetch(doc.token_endpoint, {
        method: "POST",
        headers,
        body: body.toString(),
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: "error",
      });
      if (!response.ok) throw new Error("Identity exchange failed");
      const tokens = tokenSchema.parse(await response.json());
      const { payload } = await jwtVerify(
        tokens.id_token,
        createRemoteJWKSet(new URL(doc.jwks_uri)),
        {
          algorithms: ["RS256"],
          issuer: config.jwt.issuer,
          audience: oidc.clientId,
          requiredClaims: ["sub", "exp", "iat", "nonce"],
        },
      );
      if (
        payload.nonce !== login.nonce ||
        (payload.azp !== undefined && payload.azp !== oidc.clientId) ||
        (Array.isArray(payload.aud) &&
          payload.aud.length > 1 &&
          payload.azp !== oidc.clientId)
      )
        throw new Error("Invalid identity token");
      const access = await verifyAccess(tokens.access_token);
      if (access.sub !== payload.sub)
        throw new Error("Identity subject mismatch");
      const identity = identityClaims(
        access,
        typeof payload.email === "string" ? payload.email : undefined,
      );
      const expiresAt = Math.min(
        identity.expiresAt,
        Number(payload.exp) * 1000,
      );
      if (expiresAt <= Date.now()) throw new Error("Expired identity token");
      return { ...identity, expiresAt, jwt: tokens.access_token };
    },
  };
}
