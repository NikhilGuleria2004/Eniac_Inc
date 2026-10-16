import { ShieldAlert, ArrowLeftRight } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { CMS_ROLES } from "../../data/constants";
import type { AccessDeniedReason, Role } from "../../types";

const REASONS: Record<NonNullable<AccessDeniedReason>, { title: string; message: string }> = {
  UNAUTHENTICATED: {
    title: "Not Authenticated",
    message: "Please sign in to access the Client Management System.",
  },
  HR_ROLE: {
    title: "Access Restricted — HR Role",
    message: "The HR role does not have access to the Client Management System. Switch to another role below or log in as ADMIN, MANAGER, SUPERVISOR, or EMPLOYEE.",
  },
  NON_BILLABLE: {
    title: "Access Restricted — Non-Billable",
    message: "Only billable employees can access the Client Management System.",
  },
  NOT_ELIGIBLE: {
    title: "Access Restricted — Not Eligible",
    message: "Your employee record is not yet eligible for CMS access.",
  },
};

function roleLabel(r: Role): string {
  return r.charAt(0) + r.slice(1).toLowerCase();
}

export function AccessDeniedPage() {
  const { user, cmsAccess, logout, setRoleForDev } = useAuth();
  const reason = cmsAccess.reason ?? "NOT_ELIGIBLE";
  const info = REASONS[reason as NonNullable<AccessDeniedReason>] ?? REASONS.NOT_ELIGIBLE;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md text-center card">
        <ShieldAlert size={48} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{info.title}</h1>
        <p className="text-sm text-gray-500 mb-6">{info.message}</p>
        {user && (
          <p className="text-xs text-gray-400 mb-4">
            Signed in as {user.firstName} {user.lastName} ({user.role})
          </p>
        )}

        {user && (
          <div className="mb-6">
            <p className="mb-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-500">
              <ArrowLeftRight size={14} /> Switch role (dev)
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {CMS_ROLES.map((r) => (
                <button
                  key={r}
                  className={`btn ${r === user.role ? "btn-primary btn-sm opacity-60 cursor-not-allowed" : "btn-secondary btn-sm"}`}
                  disabled={r === user.role}
                  onClick={() => setRoleForDev(r)}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
