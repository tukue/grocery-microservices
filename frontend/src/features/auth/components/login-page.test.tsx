import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";

const login = vi.fn();
vi.mock("./auth-context", () => ({ useSession: () => ({ login }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function renderLogin() {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: "/login", state: { from: "/cart" } }]}
    >
      <LoginPage />
    </MemoryRouter>,
  );
}
describe("deployment sign-in", () => {
  it("sends production sign-in to the server OIDC flow without collecting a password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "oidc" }))),
    );
    renderLogin();
    const button = await screen.findByRole("button", { name: "Sign In" });
    expect(button.closest("form")).toHaveAttribute(
      "action",
      "/api/auth/oidc/start",
    );
    expect(button.closest("form")).toHaveAttribute("method", "post");
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(
      button.closest("form")?.querySelector('input[name="returnTo"]'),
    ).toHaveValue("/cart");
  });
  it("keeps the existing demo sign-in for local development", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "demo" }))),
    );
    renderLogin();
    fireEvent.change(await screen.findByLabelText("Username"), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(login).toHaveBeenCalledWith("user", "password");
  });
  it("shows recovery instead of falling back to demo mode when configuration fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
    );
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in is temporarily unavailable",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});
