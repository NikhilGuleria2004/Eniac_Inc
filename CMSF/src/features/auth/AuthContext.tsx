import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, CmsAccess } from "../../types";
import { loadBackendData } from "../../data/mock";
import { apiFetch, setTokens, clearTokens, USE_API, clearTokensIfRoleMismatch } from "../../lib/api";

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
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      const storedUser = JSON.parse(stored) as User;
      if (USE_API && storedUser.role) {
        clearTokensIfRoleMismatch(storedUser.role);
      }
      return storedUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const boot = async () => {
      if (USE_API && !controller.signal.aborted) {
        await loadBackendData();
      }
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    };

    void boot();
    return () => controller.abort();
  }, [user]);

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
