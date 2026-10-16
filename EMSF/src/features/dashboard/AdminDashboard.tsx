import { NavLink } from "react-router-dom";
import { Users, UserCheck, UserX, Briefcase, Building2, TrendingUp } from "lucide-react";
import { getEmployees, getProjects, getClients, getAuditLogs, getAssignments, getDocuments, getLeaveRequests, getReviews, getAttendance } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { WorkforceChart } from "../../components/charts/WorkforceChart";
import { StatusDistributionChart } from "../../components/charts/StatusDistributionChart";
import { EMPLOYEE_STATUS_COLORS, CHART_FALLBACK_COLOR } from "../../components/charts/palette";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ACTIVE: "badge-success",
    INACTIVE: "badge-neutral",
    ONBOARDING: "badge-info",
    ON_LEAVE: "badge-warning",
    TERMINATED: "badge-danger",
    PLANNING: "badge-info",
    ON_HOLD: "badge-warning",
    COMPLETED: "badge-success",
    CANCELLED: "badge-danger",
  };

  return <span className={`badge ${variants[status] || "badge-neutral"}`}>{status}</span>;
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider break-words">{label}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 break-words">{value}</p>
        </div>
        <div className="text-gray-400 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const employees = getEmployees();
  const projects = getProjects();
  const clients = getClients();
  const auditLogs = getAuditLogs();
  const assignments = getAssignments();

  const activeEmployees = employees.filter((e) => e.employmentStatus === "ACTIVE");
  const billableEmployees = employees.filter((e) => e.billingStatus === "BILLABLE");
  const nonBillableEmployees = employees.filter((e) => e.billingStatus === "NON_BILLABLE");
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const activeClients = clients.filter((c) => c.status === "ACTIVE");

  const documents = getDocuments();
  const leaveRequests = getLeaveRequests();
  const reviews = getReviews();
  const attendance = getAttendance();
  const pendingDocReviews = documents.filter((d) => d.status === "PENDING" || d.status === "UNDER_REVIEW").length;
  const onboardingTasks = employees.filter((e) => e.employmentStatus === "ONBOARDING").length;
  const pendingLeaveApprovals = leaveRequests.filter((l) => l.status === "PENDING").length;
  const pendingReviews = reviews.filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS").length;
  const missingPunches = attendance.filter((a) => a.status === "MISSING").length;
  const lateArrivals = attendance.filter((a) => a.status === "LATE").length;
  const absentCount = attendance.filter((a) => a.status === "ABSENT").length;

  const recentLogs = auditLogs.slice(0, 5);

  // --- Chart Data Computation ---
  // Workforce Overview: Monthly headcount, new hires, exits (last 12 months)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    const year = currentYear + Math.floor((currentMonth - 11 + i) / 12);
    return { month: monthIndex, year, label: new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
  });

  const workforceData = months.map(({ month, year, label }) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const monthStartISO = monthStart.toISOString().split("T")[0];
    const monthEndISO = monthEnd.toISOString().split("T")[0];

    // Headcount: employees who joined before or during this month and haven't left
    const headcount = employees.filter((e) => {
      const joinDate = new Date(e.joiningDate);
      return joinDate <= monthEnd && (e.employmentStatus !== "TERMINATED" && e.employmentStatus !== "RESIGNED" && e.employmentStatus !== "INACTIVE");
    }).length;

    // New hires in this month
    const newHires = employees.filter((e) => {
      const joinDate = e.joiningDate.split("T")[0];
      return joinDate >= monthStartISO && joinDate <= monthEndISO;
    }).length;

    // Exits in this month (TERMINATED or RESIGNED with joining date in this month - simplified)
    const exits = employees.filter((e) => {
      if (e.employmentStatus !== "TERMINATED" && e.employmentStatus !== "RESIGNED") return false;
      // Since we don't have exit dates, we'll use updatedAt as a proxy for exit month
      const exitDate = e.updatedAt.split("T")[0];
      return exitDate >= monthStartISO && exitDate <= monthEndISO;
    }).length;

    return { month: label, headcount, newHires, exits };
  });

  // Employee Status Distribution
  const statusCounts = employees.reduce((acc, e) => {
    acc[e.employmentStatus] = (acc[e.employmentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    fill: EMPLOYEE_STATUS_COLORS[status] || CHART_FALLBACK_COLOR,
  }));

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Administrations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Enterprise workforce and system overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Employees" value={employees.length.toString()} icon={<Users aria-hidden="true" size={20} />} />
        <StatCard label="Active Employees" value={activeEmployees.length.toString()} icon={<UserCheck aria-hidden="true" size={20} />} />
        <StatCard label="Billable Employees" value={billableEmployees.length.toString()} icon={<TrendingUp aria-hidden="true" size={20} />} />
        <StatCard label="Non-Billable Employees" value={nonBillableEmployees.length.toString()} icon={<UserX aria-hidden="true" size={20} />} />
        <StatCard label="Active Projects" value={activeProjects.length.toString()} icon={<Briefcase aria-hidden="true" size={20} />} />
        <StatCard label="Active Clients" value={activeClients.length.toString()} icon={<Building2 aria-hidden="true" size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Workforce Overview</h3>
          <div className="h-64">
            <WorkforceChart data={workforceData} />
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Status Distribution</h3>
          <div className="h-64">
            <StatusDistributionChart data={statusData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pending HR Actions</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Document reviews</span>
              <span className="badge badge-warning">{pendingDocReviews}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Onboarding tasks</span>
              <span className="badge badge-warning">{onboardingTasks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Leave approvals</span>
              <span className="badge badge-warning">{pendingLeaveApprovals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Employee reviews</span>
              <span className="badge badge-warning">{pendingReviews}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Employee Activity</h3>
          <div className="space-y-3">
            {recentLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                   <p className="text-sm text-gray-900">{log.action.charAt(0) + log.action.slice(1).toLowerCase()} {(log.entity ?? "EMPLOYEE").toLowerCase()}</p>
                  <p className="text-xs text-gray-500">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Attendance Exceptions</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Missing punches</span>
              <span className="badge badge-danger">{missingPunches}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Late arrivals</span>
              <span className="badge badge-warning">{lateArrivals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Absent records</span>
              <span className="badge badge-warning">{absentCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Projects & Resource Allocation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Project</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Manager</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Employees</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Progress</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map((project) => {
                const client = clients.find((c) => c.id === project.clientId);
                const manager = employees.find((e) => e.id === project.managerId);
                const assignmentCount = assignments.filter((a) => a.projectId === project.id).length;
                return (
                  <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <NavLink to={ROUTES.PROJECT_DETAIL(project.id)} className="text-accent hover:underline">
                        {project.name}
                      </NavLink>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{client?.name || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{manager ? `${manager.firstName} ${manager.lastName}` : "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{assignmentCount}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={project.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent System Activity</h3>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-gray-900">{log.userName}</span>
              <span className="text-gray-500">({log.role})</span>
               <span className="text-gray-600">{(log.description ?? "").toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
