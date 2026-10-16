import { useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { FolderKanban, Pencil, UserPlus, UserMinus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { hasPermission } from "../../lib/permissions";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getProjectById,
  getEmployees,
  getAssignmentsByProject,
  getActiveAssignmentsByEmployee,
  getTimesheets,
  getInvoices,
  getAuditLogs,
  endAssignment,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { ProjectFormModal } from "./ProjectFormModal";
import { AssignmentModal } from "./AssignmentModal";
import type { Project, ProjectAssignment } from "../../types";

function HealthBadge({ health }: { health: Project["health"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    ON_TRACK: { label: "On Track", cls: "badge-success" },
    AT_RISK: { label: "At Risk", cls: "badge-warning" },
    DELAYED: { label: "Delayed", cls: "badge-danger" },
    COMPLETED: { label: "Completed", cls: "badge-neutral" },
  };
  const h = map[health] ?? { label: health, cls: "badge-neutral" };
  return <span className={`badge ${h.cls}`}>{h.label}</span>;
}

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const project = getProjectById(projectId);
  const employees = useMemo(() => getEmployees(), []);
  const assignments = useMemo(() => getAssignmentsByProject(projectId), [projectId]);
  const timesheets = useMemo(
    () => getTimesheets().filter((t) => t.projectBreakdown.some((pb) => pb.projectId === projectId)),
    [projectId]
  );
  const invoices = useMemo(() => {
    const ids = new Set(timesheets.map((t) => t.id));
    return getInvoices().filter((inv) => inv.timesheetIds?.some((id) => ids.has(id)));
  }, [timesheets]);
  const auditLogs = useMemo(() => getAuditLogs(), []);

  if (!project) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Project not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(ROUTES.PROJECTS)}>Back to Projects</button>
      </div>
    );
  }

  if (user?.role === "EMPLOYEE" && !getActiveAssignmentsByEmployee(user.employeeId ?? "").some((a) => a.projectId === project.id)) {
    return <Navigate to="/403" replace />;
  }

  const canEditProject = hasPermission(user?.role ?? "EMPLOYEE", "project.edit");
  const canAssign = hasPermission(user?.role ?? "EMPLOYEE", "assignment.create");
  const manager = employees.find((e) => e.id === project.managerId);
  const supervisor = employees.find((e) => e.id === project.supervisorId);
  const nameOf = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");

  const handleEnd = (a: ProjectAssignment) => {
    endAssignment(a.id);
    addToast("success", `${nameOf(a.employeeId)} removed from project`);
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-institutional text-gray-700"><FolderKanban size={26} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <StatusBadge status={project.status} kind="project" label={project.status} />
              <HealthBadge health={project.health} />
            </div>
            <p className="text-sm text-gray-500">{project.projectCode} · {project.clientName}</p>
          </div>
        </div>
        {(canEditProject || canAssign) && (
          <div className="flex items-center gap-2">
            {canEditProject && <button className="btn btn-secondary" onClick={() => setEditOpen(true)}><Pencil size={16} className="mr-2" />Edit</button>}
            {canAssign && <button className="btn btn-primary" onClick={() => setAssignOpen(true)}><UserPlus size={16} className="mr-2" />New Assignment</button>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-900">{project.progress}%</span>
        </div>
        <Progress value={project.progress} showLabel />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Project Information</h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Name</dt><dd className="text-gray-900">{project.name}</dd>
                <dt className="text-gray-500">Code</dt><dd className="text-gray-900">{project.projectCode}</dd>
                <dt className="text-gray-500">Client</dt><dd className="text-gray-900">{project.clientName}</dd>
                <dt className="text-gray-500">Manager</dt><dd className="text-gray-900">{manager ? `${manager.firstName} ${manager.lastName}` : "—"}</dd>
                <dt className="text-gray-500">Supervisor</dt><dd className="text-gray-900">{supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : "—"}</dd>
                <dt className="text-gray-500">Tier</dt><dd className="text-gray-900">{project.tier ?? "—"}</dd>
                {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                  <>
                    <dt className="text-gray-500">Budget</dt><dd className="text-gray-900">{project.budget ? formatCurrency(project.budget, project.budgetCurrency ?? "USD") : "—"}</dd>
                  </>
                )}
                <dt className="text-gray-500">Visibility</dt><dd className="text-gray-900">{project.visibility.replace("_", " ")}</dd>
              </dl>
              <p className="mt-3 text-sm text-gray-600">{project.description || "No description."}</p>
            </div>

            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Project Health</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"] as const).map((h) => (
                  <div key={h} className="rounded-md border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{h.replace("_", " ")}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{project.health === h ? "Current" : "—"}</p>
                  </div>
                ))}
              </div>
              <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-900">Milestones</h3>
              <p className="text-sm text-gray-500">No milestones defined for this project.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 pt-6">
          {canAssign && (
            <div className="flex justify-end">
              <button className="btn btn-secondary" onClick={() => setAssignOpen(true)}><UserPlus size={16} className="mr-2" />Add Team Member</button>
            </div>
          )}
          <DataTable
            data={activeAssignments}
            keyExtractor={(a) => a.id}
            emptyState={{ title: "No team members yet", description: "Add a team member to get started." }}
            columns={[
              { key: "employee", header: "Employee", cell: (a) => (
                <div><p className="font-medium text-gray-900">{nameOf(a.employeeId)}</p><p className="text-xs text-gray-500">{a.employeeId}</p></div>
              ) },
              { key: "role", header: "Role on Project", cell: (a) => a.role },
              { key: "billable", header: "Billable", cell: (a) => (a.billable ? "Yes" : "No") },
              { key: "allocation", header: "Allocation %", cell: (a) => `${a.allocation}%` },
              { key: "startDate", header: "Start Date", cell: (a) => a.startDate },
              { key: "endDate", header: "End Date", cell: (a) => a.endDate ?? "—" },
              { key: "actions", header: "Actions", cell: (a) => (
                <button className="text-gray-500 hover:text-danger text-sm" onClick={() => handleEnd(a)}><UserMinus size={14} className="inline" /> Remove</button>
              ) },
            ]}
          />
        </TabsContent>

        <TabsContent value="assignments" className="pt-6">
          <DataTable
            data={assignments}
            keyExtractor={(a) => a.id}
            emptyState={{ title: "No assignments" }}
            columns={[
              { key: "employee", header: "Employee", cell: (a) => <span className="font-medium text-gray-900">{nameOf(a.employeeId)}</span> },
              { key: "role", header: "Role", cell: (a) => a.role },
              { key: "allocation", header: "Allocation %", cell: (a) => `${a.allocation}%` },
              { key: "billable", header: "Billable", cell: (a) => (a.billable ? "Yes" : "No") },
              { key: "startDate", header: "Start", cell: (a) => a.startDate },
              { key: "endDate", header: "End", cell: (a) => a.endDate ?? "—" },
              { key: "status", header: "Status", cell: (a) => (
                a.status === "ACTIVE" ? <StatusBadge status="ACTIVE" label="Active" />
                : a.status === "PENDING" ? <StatusBadge status="SUSPENDED" label="Pending" />
                : <StatusBadge status="CLOSED" label="Ended" />
              ) },
              { key: "actions", header: "Actions", cell: (a) => (
                a.status === "ACTIVE" ? <button className="text-gray-500 hover:text-danger text-sm" onClick={() => handleEnd(a)}>End</button> : <span className="text-gray-400 text-sm">—</span>
              ) },
            ]}
          />
        </TabsContent>

        <TabsContent value="timesheets" className="pt-6">
          <DataTable
            data={timesheets}
            keyExtractor={(t) => t.id}
            emptyState={{ title: "No timesheets" }}
            columns={[
              { key: "employeeName", header: "Employee", cell: (t) => <span className="font-medium text-gray-900">{t.employeeName}</span> },
              { key: "periodLabel", header: "Period", cell: (t) => t.periodLabel },
              { key: "totalHours", header: "Hours", cell: (t) => `${t.totalHours} h` },
              { key: "billableAmount", header: "Billable Amount", cell: (t) => formatCurrency(t.billableAmount, t.currency) },
              { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} kind="timesheet" /> },
              { key: "reviewedBy", header: "Reviewed By", cell: (t) => t.reviewedBy ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="pt-6">
          <DataTable
            data={invoices}
            keyExtractor={(i) => i.id}
            emptyState={{ title: "No invoices" }}
            columns={[
              { key: "invoiceNumber", header: "Invoice", cell: (i) => <span className="font-medium text-gray-900">{i.invoiceNumber}</span> },
              { key: "periodLabel", header: "Period", cell: (i) => i.periodLabel ?? "—" },
              { key: "totalAmount", header: "Amount", cell: (i) => formatCurrency(i.totalAmount, i.currency) },
              { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} kind="invoice" /> },
              { key: "issueDate", header: "Issued", cell: (i) => i.issueDate },
              { key: "dueDate", header: "Due", cell: (i) => i.dueDate },
            ]}
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ul className="card divide-y divide-gray-100">
            {auditLogs.filter((a) => a.entity === "PROJECT").slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-900">{a.description}</p>
                  <p className="text-xs text-gray-500">{a.userName}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <ProjectFormModal open={editOpen} initialData={project} onClose={() => setEditOpen(false)} />
      <AssignmentModal open={assignOpen} projectId={projectId} onClose={() => setAssignOpen(false)} />
    </div>
  );
}
