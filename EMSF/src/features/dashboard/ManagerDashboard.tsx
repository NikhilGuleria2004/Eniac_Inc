import { getClients, getProjects, getAssignments, getAuditLogs } from "../../data/mock/repositories";
import { ProjectHealthChart } from "../../components/charts/ProjectHealthChart";
import { AttendanceMarker } from "../../components/dashboard/AttendanceMarker";

const HEALTH_COLORS: Record<string, string> = {
  ON_TRACK: "#16803C",
  AT_RISK: "#B7791F",
  DELAYED: "#C53030",
  COMPLETED: "#1D4ED8",
  PLANNING: "#2563EB",
  ON_HOLD: "#667085",
  ACTIVE: "#16803C",
  CANCELLED: "#7F1D1D",
};

export function ManagerDashboard() {
  const clients = getClients();
  const projects = getProjects();
  const assignments = getAssignments();
  const auditLogs = getAuditLogs();

  const activeClients = clients.filter((c) => c.status === "ACTIVE");
  const activeProjectsList = projects.filter((p) => p.status === "ACTIVE");
  const assignedEmployees = new Set(assignments.map((a) => a.employeeId)).size;
  const projectsAtRisk = projects.filter((p) => p.health === "AT_RISK").length;

  // --- Chart Data Computation ---
  // Project Health Distribution
  const healthCounts = projects.reduce((acc, p) => {
    acc[p.health] = (acc[p.health] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const healthData = Object.entries(healthCounts).map(([name, value]) => ({
    name,
    value,
    fill: HEALTH_COLORS[name] || "#667085",
  }));

  // Project Status Distribution
  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    fill: HEALTH_COLORS[name] || "#667085",
  }));

  // Recent Client Activity (from audit logs)
  const clientActivity = auditLogs
    .filter((log) => log.entity === "CLIENT" || log.entity === "PROJECT" || log.entity === "EMPLOYEE")
    .slice(0, 8);

  return (
     <div className="page-container space-y-6">
       <div>
         <h1 className="text-xl font-semibold text-gray-900">Management Dashboard</h1>
         <p className="text-sm text-gray-500 mt-1">Clients, projects and resource allocation</p>
       </div>

      <AttendanceMarker />


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={activeClients.length.toString()} />
        <StatCard label="Active Projects" value={activeProjectsList.length.toString()} />
        <StatCard label="Assigned Employees" value={assignedEmployees.toString()} />
        <StatCard label="Projects At Risk" value={projectsAtRisk.toString()} />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Portfolio</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Project</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Team Size</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Start Date</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">End Date</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Progress</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map((project) => {
                const client = clients.find((c) => c.id === project.clientId);
                return (
                  <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{project.name}</td>
                    <td className="py-2 px-3 text-gray-600">{client?.name || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{project.teamSize}</td>
                    <td className="py-2 px-3 text-gray-600">{new Date(project.startDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-2 px-3 text-gray-600">{new Date(project.endDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</td>
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
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Resource Allocation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Employee</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Current Project</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Allocation</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Role</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Billable</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.slice(0, 5).map((asgn) => {
                const project = projects.find((p) => p.id === asgn.projectId);
                return (
                  <tr key={asgn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{asgn.employeeId}</td>
                    <td className="py-2 px-3 text-gray-600">{project?.name || "-"}</td>
                    <td className="py-2 px-3 text-gray-600">{asgn.allocation}%</td>
                    <td className="py-2 px-3 text-gray-600">{asgn.role}</td>
                    <td className="py-2 px-3">
                      <span className={`badge ${asgn.billable ? "badge-success" : "badge-neutral"}`}>
                        {asgn.billable ? "Billable" : "Non-Billable"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={asgn.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Health</h3>
          <div className="h-64">
            <ProjectHealthChart healthData={healthData} statusData={statusData} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Client Activity</h3>
          <div className="space-y-3">
            {clientActivity.length > 0 ? (
              clientActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-900">
                      {log.action.charAt(0) + log.action.slice(1).toLowerCase()} {log.entity.toLowerCase()}
                    </p>
                    <p className="text-xs text-gray-500">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.timestamp).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      at {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      by {log.userName} ({log.role})
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider break-words">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 break-words">{value}</p>
    </div>
  );
}

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
