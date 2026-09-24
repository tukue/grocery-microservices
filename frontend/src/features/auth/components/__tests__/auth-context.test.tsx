import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useSession } from "../auth-context";
import { LoginPage } from "../login-page";

function SessionProbe() {
  const { session, loading } = useSession();
  if (loading) return <div role="status">checking session</div>;
  return (
    <div>
      <span data-testid="session">
        {session ? `${session.userId}:${session.email}` : "signed-out"}
      </span>
    </div>
  );
}

function ProtectedProbe() {
  const { session, loading } = useSession();
  if (loading) return <div role="status">loading</div>;
  if (!session) return <div data-testid="redirected">login required</div>;
  return <div data-testid="protected">protected</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AuthProvider session flow", () => {
  it("loads an existing session on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ userId: "u1", email: "u1@example.com" }),
            { status: 200 },
          ),
        ),
    );

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("checking session");
    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent(
        "u1:u1@example.com",
      ),
    );
  });

  it("treats a 401 as signed out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    );

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("signed-out"),
    );
  });

  it("logs in and sets the session", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/login")) {
          return new Response(
            JSON.stringify({
              user: { userId: "alice", email: "alice@example.com" },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/me")) {
          return new Response(null, { status: 401 });
        }
        return new Response(null, { status: 404 });
      }),
    );

    function LoginWithSession() {
      const { session } = useSession();
      return (
        <div>
          <LoginPage />
          <span data-testid="session">
            {session ? session.userId : "signed-out"}
          </span>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginWithSession />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("alice"),
    );
  });

  it("shows an error when login fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return new Response(null, { status: 401 });
        }
        if (url.includes("/api/auth/login")) {
          return new Response(JSON.stringify({ error: "Bad credentials" }), {
            status: 401,
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Bad credentials"),
    );
  });

  it("logs out and clears the session", async () => {
    let loggedOut = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/logout")) {
          loggedOut = true;
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url.includes("/api/auth/me")) {
          if (loggedOut) return new Response(null, { status: 401 });
          return new Response(
            JSON.stringify({ userId: "u1", email: "u1@example.com" }),
            { status: 200 },
          );
        }
        return new Response(null, { status: 404 });
      }),
    );

    function LogoutProbe() {
      const { session, logout } = useSession();
      return (
        <div>
          <span data-testid="session">
            {session ? session.userId : "signed-out"}
          </span>
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("u1"),
    );
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() =>
      expect(screen.getByTestId("session")).toHaveTextContent("signed-out"),
    );
    expect(loggedOut).toBe(true);
  });
});

describe("Route protection", () => {
  it("blocks protected content while unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    render(
      <AuthProvider>
        <ProtectedProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("redirected")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("allows protected content when a session exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ userId: "u1", email: "u1@example.com" }),
            { status: 200 },
          ),
        ),
    );

    render(
      <AuthProvider>
        <ProtectedProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("protected")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("redirected")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users away from protected routes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    function MirrorProtectedRoute() {
      const { session, loading } = useSession();
      if (loading) return <div role="status">Loading...</div>;
      if (!session) return <div data-testid="redirected">to /login</div>;
      return <div data-testid="protected">outlet</div>;
    }

    render(
      <AuthProvider>
        <MirrorProtectedRoute />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("redirected")).toHaveTextContent("to /login"),
    );
  });
});
