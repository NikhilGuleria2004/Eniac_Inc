import { useAuth } from "../../features/auth/AuthContext";

export function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  return <DashboardPlaceholder role={user.role} />;
}

function DashboardPlaceholder({ role }: { role: string }) {
  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Authenticated as <span className="font-medium text-gray-900">{role}</span>
      </p>
      <div className="card">
        <p className="text-sm text-gray-500">
          Role-specific dashboards are implemented in <strong>Phase 2</strong>.
        </p>
      </div>
    </div>
  );
}
