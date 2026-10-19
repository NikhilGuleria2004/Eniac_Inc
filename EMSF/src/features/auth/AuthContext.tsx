import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role } from "../../types";
import { apiFetch, setTokens, getAccessToken, refreshAccessToken, clearTokens } from "../../lib/api";
import { loadBackendData } from "../../data/mock";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  backendReady: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      let accessToken = getAccessToken();
      let authenticated = false;

      if (!accessToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          accessToken = refreshed;
        }
      }

      if (accessToken) {
        try {
          const res = await apiFetch("/auth/me");
          const u = res.data as { id: string; email: string; firstName: string; lastName: string; role: Role; employeeId?: string };
          setUser({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            employeeId: u.employeeId
          });
          authenticated = true;
        } catch {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            try {
              const res = await apiFetch("/auth/me");
              const u = res.data as { id: string; email: string; firstName: string; lastName: string; role: Role; employeeId?: string };
              setUser({
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                role: u.role,
                employeeId: u.employeeId
              });
              authenticated = true;
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      }

      if (authenticated) {
        await loadBackendData();
        setBackendReady(true);
      } else {
        setBackendReady(true);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const data = res.data as { accessToken: string; refreshToken: string; expiresIn: number; user: { id: string; email: string; firstName: string; lastName: string; role: Role; employeeId?: string } };
      setTokens(data.accessToken, data.refreshToken);
      setUser({
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        employeeId: data.user.employeeId
      });
      await loadBackendData();
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, backendReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
