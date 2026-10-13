import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import type { AccessDeniedReason } from "../../types";

const REASONS: Record<NonNullable<AccessDeniedReason>, { title: string; message: string }> = {
  HR_ROLE: {
    title: "Access Restricted — HR Role",
    message: "The HR role does not have access to the Client Management System. Use the role switcher or log in as ADMIN, MANAGER, SUPERVISOR, or EMPLOYEE.",
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

export function AccessDeniedPage() {
  const { user, cmsAccess, logout } = useAuth();
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
        <button className="btn btn-primary" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
