import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { clearToken, login as apiLogin, readToken, writeToken } from "../api/auth-client";

type AuthContextValue = {
  token: string | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readToken(),
  );

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    writeToken(response.token);
    setToken(response.token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    try {
      window.localStorage.removeItem("grocery:cart-id");
    } catch {
      // Best-effort cleanup.
    }
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, isLoggedIn: token !== null, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
