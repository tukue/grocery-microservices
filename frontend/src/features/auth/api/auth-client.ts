const TOKEN_KEY = "grocery:auth-token";

export type LoginResponse = {
  token: string;
  type: string;
};

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

/** POST /api/auth/login (proxied to cart-service :8081). */
export async function login(username: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    throw new AuthApiError(error instanceof Error ? error.message : "Network error during login.", 0);
  }

  if (!response.ok) {
    throw new AuthApiError(
      response.status === 401 ? "Invalid credentials." : `Login failed (${response.status}).`,
      response.status,
    );
  }

  const body = (await response.json().catch(() => null)) as LoginResponse | null;
  if (!body || typeof body.token !== "string") {
    throw new AuthApiError("Unexpected login response from server.", response.status);
  }
  return body;
}

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Token persistence is best-effort.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Best-effort cleanup.
  }
}

export function authHeader(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
