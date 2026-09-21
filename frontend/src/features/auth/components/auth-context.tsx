import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Session } from "../domain/session";
import {
  getSession,
  login as apiLogin,
  logout as apiLogout,
} from "../api/auth-api";

type AuthContextValue = {
  readonly session: Session;
  readonly loading: boolean;
  readonly login: (username: string, password: string) => Promise<void>;
  readonly logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const s = await apiLogin(username, password);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used within AuthProvider");
  return ctx;
}
