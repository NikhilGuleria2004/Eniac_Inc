import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role, CmsAccess } from "../../types";
import { DEMO_USERS } from "../../data/constants";

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
    return { granted: false, reason: "HR_ROLE" };
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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const match = DEMO_USERS.find(
      (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password
    );
    if (!match) return false;
    const u = buildUser(match.role);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return true;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const setRoleForDev = (role: Role) => {
    const u = buildUser(role);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
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
