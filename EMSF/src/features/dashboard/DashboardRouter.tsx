import { AdminDashboard } from "./AdminDashboard";
import { HRDashboard } from "./HRDashboard";
import { ManagerDashboard } from "./ManagerDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { EmployeeDashboard } from "./EmployeeDashboard";
import { useAuth } from "../auth/AuthContext";

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "HR":
      return <HRDashboard />;
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

export { DashboardRouter };
