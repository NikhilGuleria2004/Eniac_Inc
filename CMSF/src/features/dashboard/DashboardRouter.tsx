import { useAuth } from "../../features/auth/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { ManagerDashboard } from "./ManagerDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { EmployeeDashboard } from "./EmployeeDashboard";

export function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "MANAGER":
      return <ManagerDashboard />;
    case "SUPERVISOR":
      return <SupervisorDashboard />;
    case "EMPLOYEE":
      return <EmployeeDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}
