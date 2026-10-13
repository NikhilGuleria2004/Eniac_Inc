import { useAuth } from "../../features/auth/AuthContext";
import { getProjects, getAssignments, getAuditLogs, getEmployees, getClients } from "../../data/mock/repositories";
import { AttendanceMarker } from "../../components/dashboard/AttendanceMarker";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const projects = getProjects();
  const assignments = getAssignments();
  const auditLogs = getAuditLogs();
  const employees = getEmployees();
  const clients = getClients();

  // Filter projects where supervisor is assigned
  const assignedProjects = projects.filter(
    (p) => p.supervisorId === user?.employeeId || p.supervisorId
  );
  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");
  const projectsRequiringAttention = projects.filter(
    (p) => p.health === "AT_RISK" || p.health === "DELAYED"
  );

  // Recent Activity (from audit logs) - filter for project/assignment related activities
  const recentActivity = auditLogs
    .filter(
      (log) =>
        log.entity === "PROJECT" ||
        log.entity === "EMPLOYEE" ||
        (log.entity === "ATTENDANCE" && log.action !== "LOGIN")
    )
    .slice(0, 8);

  // Helper to get employee name
  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : id;
  };

  // Helper to get client name
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "-";
  };

  // Helper to get project name
  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || projectId;
  };

  return (
     <div className="page-container space-y-6">
       <div>
         <h1 className="text-xl font-semibold text-gray-900">Supervisor Workspace</h1>
         <p className="text-sm text-gray-500 mt-1">Project resources and operational overview</p>
       </div>

      <AttendanceMarker />


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assigned Projects" value={assignedProjects.length.toString()} />
        <StatCard label="Team Members" value={new Set(assignments.map((a) => a.employeeId)).size.toString()} />
        <StatCard label="Active Assignments" value={activeAssignments.length.toString()} />
        <StatCard label="Projects Requiring Attention" value={projectsRequiringAttention.length.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">My Projects</h3>
          <div className="space-y-3">
            {assignedProjects.slice(0, 4).map((project) => {
              const clientName = getClientName(project.clientId);
              return (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500">{clientName} • {project.progress}% complete</p>
                  </div>
                  <StatusBadge status={project.health} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Progress</h3>
          <div className="space-y-3">
            {assignedProjects.slice(0, 4).map((project) => {
              const clientName = getClientName(project.clientId);
              return (
                <div key={project.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">{project.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${project.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-600">{project.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Assignments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Employee</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Project</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Role</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Allocation</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.slice(0, 5).map((asgn) => (
                  <tr key={asgn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{getEmployeeName(asgn.employeeId)}</td>
                    <td className="py-2 px-3 text-gray-600">{getProjectName(asgn.projectId)}</td>
                    <td className="py-2 px-3 text-gray-600">{asgn.role}</td>
                    <td className="py-2 px-3 text-gray-600">{asgn.allocation}%</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={asgn.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((log) => (
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
    <div className="card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ON_TRACK: "badge-success",
    AT_RISK: "badge-warning",
    DELAYED: "badge-danger",
    COMPLETED: "badge-success",
    ACTIVE: "badge-success",
    PENDING: "badge-warning",
    ENDED: "badge-neutral",
  };

  return <span className={`badge ${variants[status] || "badge-neutral"}`}>{status}</span>;
}
