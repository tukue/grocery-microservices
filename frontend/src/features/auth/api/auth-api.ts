import type { Session } from "../domain/session";

export async function login(
  username: string,
  password: string,
): Promise<Session> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Login failed");
  }
  const data = await res.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getSession(): Promise<Session> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}
