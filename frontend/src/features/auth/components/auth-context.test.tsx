import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useSession } from "./auth-context";
afterEach(() => vi.unstubAllGlobals());
function Probe() {
  const { loading, session } = useSession();
  return <div>{loading ? "loading" : (session?.email ?? "signed out")}</div>;
}
describe("AuthProvider", () => {
  it("loads an existing session", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ userId: "u", email: "u@example.com" }),
            { status: 200 },
          ),
        ),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("u@example.com")).toBeInTheDocument(),
    );
  });
  it("settles signed out after an expired session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("signed out")).toBeInTheDocument(),
    );
  });
});
