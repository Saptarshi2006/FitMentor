import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth as useServerAuth } from "@/utils/oauth";

const AuthContext = createContext<{ user: any | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const serverAuth = useServerAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user: serverAuth?.user || null, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
