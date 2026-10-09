import { type FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSession } from "./auth-context";

export function LoginPage() {
  const submittingRef = useRef(false);
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"demo" | "oidc" | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configAttempt, setConfigAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setConfigError(false);
    fetch("/api/auth/config", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        const body: unknown = await response.json();
        if (
          !body ||
          typeof body !== "object" ||
          !("mode" in body) ||
          !["demo", "oidc"].includes(String(body.mode))
        )
          throw new Error("Invalid configuration");
        if (!controller.signal.aborted) setMode(body.mode as "demo" | "oidc");
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigError(true);
      });
    return () => controller.abort();
  }, [configAttempt]);
  const returnTo =
    (location.state as { from?: string } | null)?.from ?? "/products";
  const callbackFailed =
    new URLSearchParams(location.search).get("error") === "signin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/products";
      navigate(
        destination.startsWith("/") &&
          !destination.startsWith("//") &&
          !/[\\\x00-\x20]/.test(destination)
          ? destination
          : "/products",
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <p className="eyebrow">WELCOME TO GROVE</p>
        <h2>
          Access your account.
          <br />
          Manage your purchases.
        </h2>
        <p>Access your saved cart and order history.</p>
      </section>
      <section className="login-form">
        <h1>Sign In</h1>
        <p className="muted">Sign in to continue shopping.</p>
        {callbackFailed && (
          <p role="alert">Sign-in could not be completed. Please try again.</p>
        )}
        {configError ? (
          <div role="alert">
            <p>Sign-in is temporarily unavailable.</p>
            <button onClick={() => setConfigAttempt((attempt) => attempt + 1)}>
              Try again
            </button>
          </div>
        ) : mode === null ? (
          <p role="status">Loading sign-in…</p>
        ) : mode === "oidc" ? (
          <form method="post" action="/api/auth/oidc/start">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="button button-primary">
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="username"
              >
                Username
              </label>
              <input
                className="w-full border border-zinc-300 px-3 py-2"
                autoComplete="username"
                id="username"
                onChange={(e) => setUsername(e.target.value)}
                required
                type="text"
                value={username}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className="w-full border border-zinc-300 px-3 py-2"
                autoComplete="current-password"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              className="bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
