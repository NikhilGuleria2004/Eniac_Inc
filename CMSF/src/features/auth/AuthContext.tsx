import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role, CmsAccess } from "../../types";
import { DEMO_USERS } from "../../data/constants";
import { loadBackendData } from "../../data/mock";
import { apiFetch, setTokens, clearTokens, getAccessToken, getRefreshToken, USE_API, refreshAccessToken, clearTokensIfRoleMismatch } from "../../lib/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setRoleForDev: (role: Role) => void;
  cmsAccess: CmsAccess;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "cmsf_user";

function buildUser(role: Role): User {
  const demo = DEMO_USERS.find((d) => d.role === role) ?? DEMO_USERS[0];
  const [firstName, lastName] = demo.name.split(" ");
  return {
    id: `user_${role.toLowerCase()}`,
    email: demo.email,
    firstName: firstName,
    lastName: lastName,
    role,
    employeeId:
      role === "EMPLOYEE"
        ? "EMP-005"
        : role === "SUPERVISOR"
        ? "EMP-002"
        : role === "HR"
        ? undefined
        : "EMP-001",
    billingStatus: role === "EMPLOYEE" ? "BILLABLE" : role === "HR" ? "NON_BILLABLE" : "BILLABLE",
    timesheetEligibility: "ELIGIBLE",
  };
}

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
        // user, clear the stale tokens so the API calls use the correct role
        // (or no token at all, falling back to mock data).
        if (USE_API && storedUser.role) {
          clearTokensIfRoleMismatch(storedUser.role);
        }

        // Proactively refresh an expired access token before hitting the API
        // for the data bootstrap — avoids a cascade of 401s during boot.
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
          user: { id: string; email: string; firstName: string; lastName: string; role: Role; employeeId?: string };
        }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        const data = res.data;
        setTokens(data.accessToken, data.refreshToken);
        const apiUser: User = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
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
        console.error("Login API call failed, falling back to demo accounts:", error);
      }
    }

    const match = DEMO_USERS.find(
      (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password
    );
    if (!match) return false;
    // Clear any stale API token from a previous session before falling back
    // to demo mode — otherwise the backend authorizes with the old role.
    clearTokens();
    const u = buildUser(match.role);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    await loadBackendData();
    return true;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    clearTokens();
    setUser(null);
  };

  const setRoleForDev = (role: Role) => {
    const u = buildUser(role);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    // Dev role switching changes the frontend role but cannot update the JWT.
    // Clear stale tokens so the backend role and the frontend role stay in sync —
    // otherwise the API calls use the old JWT role and return 403.
    clearTokens();
  };

  const cmsAccess = checkCmsAccess(user);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, setRoleForDev, cmsAccess }}
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
