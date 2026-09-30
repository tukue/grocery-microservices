import type { Session } from "../domain/session";
import { z } from "zod";

const sessionSchema = z.object({
  userId: z.string().min(1),
  email: z.string().min(1),
});

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
  return sessionSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Logout failed");
}

export async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return sessionSchema.parse(await res.json());
}
