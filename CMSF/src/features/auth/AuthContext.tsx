import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, CmsAccess } from "../../types";
import { loadBackendData } from "../../data/mock";
import { apiFetch, setTokens, clearTokens, getAccessToken, getRefreshToken, USE_API, refreshAccessToken, clearTokensIfRoleMismatch } from "../../lib/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  cmsAccess: CmsAccess;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "cmsf_user";

export function checkCmsAccess(user: User | null): CmsAccess {
  if (!user) {
    return { granted: false, reason: "UNAUTHENTICATED" };
  }
  if (user.role === "HR") {
    return { granted: false, reason: "HR_ROLE" };
  }
  if (user.role === "EMPLOYEE" && user.billingStatus !== "BILLABLE") {
    return { granted: false, reason: "NON_BILLABLE" };
  }
  return { granted: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      let storedUser: User | null = null;
      if (stored) {
        try {
          storedUser = JSON.parse(stored) as User;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          storedUser = null;
        }
      }

      if (storedUser) {
        if (!cancelled) setUser(storedUser);

        // If the JWT in localStorage has a role that doesn't match the stored
        // user, clear the stale tokens so the API calls use the correct role.
        if (USE_API && storedUser.role) {
          clearTokensIfRoleMismatch(storedUser.role);
        }

        // Proactively refresh an expired access token before hitting the API
        // for the data bootstrap.
        if (USE_API && getAccessToken() && getRefreshToken()) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            clearTokens();
            localStorage.removeItem(STORAGE_KEY);
            if (!cancelled) setUser(null);
          }
        }

        await loadBackendData();
      }
      if (!cancelled) setIsLoading(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (USE_API) {
      try {
        const res = await apiFetch<{
          accessToken: string;
          refreshToken?: string;
          user: { id: string; email: string; firstName: string; lastName: string; role: string; employeeId?: string };
        }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        const data = res.data;
        setTokens(data.accessToken, data.refreshToken);
        const apiUser: User = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role as User["role"],
          employeeId: data.user.employeeId,
          billingStatus:
            data.user.role === "EMPLOYEE"
              ? "BILLABLE"
              : data.user.role === "HR"
              ? "NON_BILLABLE"
              : "BILLABLE",
          timesheetEligibility: "ELIGIBLE",
        };
        setUser(apiUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiUser));
        await loadBackendData();
        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    }

    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    clearTokens();
    setUser(null);
  };

  const cmsAccess = checkCmsAccess(user);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, cmsAccess }}
    >
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
