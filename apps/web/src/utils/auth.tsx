import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getSessionUser, type SessionUser } from "@/utils/oauth";

const AuthContext = createContext<SessionUser | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    setUser(getSessionUser());
    const handler = () => setUser(getSessionUser());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth(): SessionUser | null {
  return useContext(AuthContext);
}
