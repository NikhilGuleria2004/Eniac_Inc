import { useUrlState } from "../../lib/useUrlState";
import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Users, Clock, ArrowLeft, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { Modal } from "../../components/ui/Modal";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { getProjectById, getProjectsByClient, getEmployees, createAssignment, updateAssignment, deleteAssignment, getAuditLogs } from "../../data/mock/repositories";
import { getProjectAssignments, getProjectManager, getProjectSupervisor, getProjectClient, getAvailableEmployees, computeTeamStats, getProjectProgressHealth, getProjectStatusInfo } from "./projects";
import { ROUTES } from "../../data/constants";
import { hasPermission } from "../../lib/permissions";
import { useAuth } from "../../features/auth/AuthContext";
import type { Project, ProjectAssignment, Employee, Role } from "../../types";

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  initialData: ProjectAssignment | null;
  availableEmployees: Employee[];
  onSubmit: (data: any) => void;
}

function AssignmentModal({ open, onClose, initialData, availableEmployees, onSubmit }: AssignmentModalProps) {
  const [formData, setFormData] = useState({
    employeeId: "",
    role: "",
    allocation: 100,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billable: true,
    status: "ACTIVE" as ProjectAssignment["status"],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId,
        role: initialData.role,
        allocation: initialData.allocation,
        startDate: initialData.startDate,
        endDate: initialData.endDate || "",
        billable: initialData.billable,
        status: initialData.status,
      });
    } else {
      setFormData({
        employeeId: "",
        role: "",
        allocation: 100,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        billable: true,
        status: "ACTIVE" as ProjectAssignment["status"],
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const roles = ["Project Manager", "Supervisor", "Software Engineer", "Senior Software Engineer", "QA Engineer", "Business Analyst", "UI/UX Designer", "DevOps Engineer", "Technical Lead", "Product Manager"];

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Assignment" : "Assign Employee"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="employee">Employee *</label>
          <select id="employee"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="form-input"
            required
            disabled={availableEmployees.length === 0}
          >
            <option value="">Select employee</option>
            {availableEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode}) - {emp.designation}
              </option>
            ))}
          </select>
          {availableEmployees.length === 0 && !initialData && (
            <p className="text-xs text-red-600 mt-1">All active employees are already assigned to this project.</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">Role *</label>
            <select id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="form-input" required>
              <option value="">Select role</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="allocation">Allocation (%) *</label>
            <input id="allocation" type="number" min="1" max="100" value={formData.allocation} onChange={(e) => setFormData({ ...formData, allocation: Number(e.target.value) })} className="form-input" required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">Start Date *</label>
            <input id="start-date" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="form-input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">End Date</label>
            <input id="end-date" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="form-input" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.billable} onChange={(e) => setFormData({ ...formData, billable: e.target.checked })} className="h-4 w-4" />
            <span className="text-sm text-gray-700">Billable</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Status</span>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectAssignment["status"] })} className="form-input w-auto">
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={availableEmployees.length === 0 && !initialData}>
            {initialData ? "Save Changes" : "Assign Employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectDetailPage() {
  const [tab, setTab] = useUrlState("tab", "overview");

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<ProjectAssignment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectAssignment | null>(null);

  const project = useMemo(() => getProjectById(projectId!), [projectId]);
  const assignments = useMemo(() => getProjectAssignments(projectId!), [projectId]);
  const client = useMemo(() => project ? getProjectClient(project) : undefined, [projectId]);
  const manager = useMemo(() => project ? getProjectManager(project) : undefined, [projectId]);
  const supervisor = useMemo(() => project ? getProjectSupervisor(project) : undefined, [projectId]);
  const availableEmployees = useMemo(() => getAvailableEmployees(projectId!), [projectId]);
  const teamStats = useMemo(() => computeTeamStats(assignments), [assignments]);
  const siblingProjects = useMemo(() => client ? getProjectsByClient(client.id).filter((p) => p.id !== projectId) : [], [projectId, client]);
  const auditLogs = useMemo(() => getAuditLogs().filter((log) => log.entity === "PROJECT" && log.entityId === projectId).slice(0, 10), [projectId]);

  if (!project) return <div className="page-container"><h1 className="text-xl font-semibold text-gray-900">Project not found</h1></div>;

  const canManage = hasPermission((user?.role as Role) || "EMPLOYEE", "project.manage");
  const canAssign = hasPermission((user?.role as Role) || "EMPLOYEE", "assignment.manage");

  const progressHealth = getProjectProgressHealth(project);
  const statusInfo = getProjectStatusInfo(project);

  const handleBack = () => navigate(-1);
  const handleEdit = () => navigate(ROUTES.PROJECT_EDIT(project.id));
  const handleAssign = () => { setEditAssignment(null); setAssignModalOpen(true); };
  const handleEditAssignment = (asgn: ProjectAssignment) => { setEditAssignment(asgn); setAssignModalOpen(true); };
  const handleRemoveAssignment = (asgn: ProjectAssignment) => { setDeleteConfirm(asgn); };
  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteAssignment(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const overviewColumns = [
    { key: "name", header: "Project", cell: (row: Project) => <Link to={ROUTES.PROJECT_DETAIL(row.id)} className="font-medium text-gray-900 hover:text-accent">{row.name}</Link> },
    { key: "projectCode", header: "Code", cell: (row: Project) => row.projectCode },
    { key: "status", header: "Status", cell: (row: Project) => <StatusBadge status={row.status} /> },
    { key: "health", header: "Health", cell: (row: Project) => <StatusBadge status={row.health} /> },
    { key: "progress", header: "Progress", cell: (row: Project) => <Progress value={row.progress} showLabel max={100} className="w-32" /> },
    { key: "teamSize", header: "Team", cell: (row: Project) => row.teamSize },
    { key: "startDate", header: "Start", cell: (row: Project) => new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "endDate", header: "End", cell: (row: Project) => new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
  ];

  const teamColumns = [
    {
      key: "employee", header: "Employee", cell: (row: ProjectAssignment) => {
        const emp = getEmployees().find((e) => e.id === row.employeeId);
        return emp ? (
          <div className="flex items-center gap-2">
            <EmployeeAvatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
            <span>{emp.firstName} {emp.lastName} <span className="text-xs text-gray-500">({emp.employeeCode})</span></span>
          </div>
        ) : "—";
      }
    },
    { key: "role", header: "Role", cell: (row: ProjectAssignment) => row.role },
    { key: "allocation", header: "Allocation", cell: (row: ProjectAssignment) => `${row.allocation}%` },
    { key: "billable", header: "Billable", cell: (row: ProjectAssignment) => <StatusBadge status={row.billable ? "BILLABLE" : "NON_BILLABLE"} /> },
    { key: "startDate", header: "Start", cell: (row: ProjectAssignment) => new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "endDate", header: "End", cell: (row: ProjectAssignment) => row.endDate ? new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
    { key: "status", header: "Status", cell: (row: ProjectAssignment) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (row: ProjectAssignment) => (
        canAssign ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleEditAssignment(row)} className="text-accent hover:underline text-sm">Edit</button>
            <button onClick={() => handleRemoveAssignment(row)} className="text-red-600 hover:underline text-sm">Remove</button>
          </div>
        ) : null
      ),
    },
  ];

  const assignmentColumns = [
    { key: "employee", header: "Employee", cell: (row: ProjectAssignment) => {
      const emp = getEmployees().find((e) => e.id === row.employeeId);
      return emp ? `${emp.firstName} ${emp.lastName}` : "—";
    }},
    { key: "project", header: "Project", cell: (_row: ProjectAssignment) => project.name },
    { key: "client", header: "Client", cell: (_row: ProjectAssignment) => client?.name || "—" },
    { key: "role", header: "Role", cell: (row: ProjectAssignment) => row.role },
    { key: "allocation", header: "Allocation", cell: (row: ProjectAssignment) => `${row.allocation}%` },
    { key: "startDate", header: "Start", cell: (row: ProjectAssignment) => new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "endDate", header: "End", cell: (row: ProjectAssignment) => row.endDate ? new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
    { key: "billable", header: "Billable", cell: (row: ProjectAssignment) => <StatusBadge status={row.billable ? "BILLABLE" : "NON_BILLABLE"} /> },
    { key: "status", header: "Status", cell: (row: ProjectAssignment) => <StatusBadge status={row.status} /> },
  ];

  const activityColumns = [
    { key: "timestamp", header: "Time", cell: (row: any) => new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
    { key: "userName", header: "User", cell: (row: any) => row.userName },
    { key: "action", header: "Action", cell: (row: any) => <StatusBadge status={row.action} /> },
    { key: "description", header: "Description", cell: (row: any) => row.description },
  ];

  return (
     <div className="page-container space-y-6 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleBack} aria-label="Go back" className="p-2 hover:bg-gray-100 rounded-md text-gray-500 shrink-0"><ArrowLeft aria-hidden="true" size={20} /></button>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="text-xl font-semibold text-gray-900 break-words">{project.name}</h1>
          <p className="text-sm text-gray-500 break-words">{project.projectCode} • {client?.name || "Unknown Client"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${statusInfo.variant}`}>{statusInfo.label}</span>
          <span className={`badge ${progressHealth.variant}`}>{progressHealth.label}</span>
          <span className="text-sm text-gray-500">{project.progress}% Complete</span>
        </div>
        {canManage && (
          <button onClick={handleEdit} className="btn btn-secondary">
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Progress</h3>
            <span className="text-lg font-semibold text-gray-900">{project.progress}%</span>
          </div>
          <Progress value={project.progress} showLabel max={100} />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Start Date</p><p className="font-medium">{new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
            <div><p className="text-gray-500">End Date</p><p className="font-medium">{new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
            <div><p className="text-gray-500">Team Size</p><p className="font-medium">{project.teamSize}</p></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Key People</h3>
            <dl className="space-y-2 text-sm">
              {manager && <div className="flex justify-between"><dt className="text-gray-500">Manager</dt><dd className="font-medium">{manager.firstName} {manager.lastName}</dd></div>}
              {supervisor && <div className="flex justify-between"><dt className="text-gray-500">Supervisor</dt><dd className="font-medium">{supervisor.firstName} {supervisor.lastName}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-500">Client</dt><dd className="font-medium">{client?.name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Team Size</dt><dd className="font-medium">{project.teamSize}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team ({teamStats.total})</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-600">{project.description || "No description provided."}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Project Code</dt><dd className="font-medium">{project.projectCode}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={project.status} /></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Health</dt><dd><StatusBadge status={project.health} /></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Progress</dt><dd className="font-medium">{project.progress}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Start Date</dt><dd className="font-medium">{new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">End Date</dt><dd className="font-medium">{new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Team Size</dt><dd className="font-medium">{project.teamSize}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="font-medium">{new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
              </dl>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Statistics</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Total Members</dt><dd className="font-medium">{teamStats.total}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Billable</dt><dd className="font-medium">{teamStats.billable}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Non-Billable</dt><dd className="font-medium">{teamStats.nonBillable}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Avg Allocation</dt><dd className="font-medium">{teamStats.avgAllocation}%</dd></div>
              </dl>
            </div>
          </div>
          {siblingProjects.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Other Projects for {client?.name}</h3>
              <DataTable data={siblingProjects} columns={overviewColumns} keyExtractor={(r: Project) => r.id} emptyState={{ title: "No other projects" }} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
            {canAssign && (
              <button onClick={handleAssign} className="btn btn-primary text-sm">
                <UserPlus aria-hidden="true" size={14} className="mr-2" />
                Assign Employee
              </button>
            )}
          </div>
          {assignments.length > 0 ? (
            <DataTable data={assignments} columns={teamColumns} keyExtractor={(r: ProjectAssignment) => r.id} emptyState={{ title: "No team members" }} />
          ) : (
            <div className="card text-center py-12">
              <Users aria-hidden="true" size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members assigned</h3>
              <p className="text-gray-500 mb-4">Assign employees to this project to build the team.</p>
              {canAssign && (
                <button onClick={handleAssign} className="btn btn-primary">
                  <UserPlus aria-hidden="true" size={16} className="mr-2" />
                  Assign First Employee
                </button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Health Status</h3>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100">
                <span className="text-2xl font-bold">{project.health.replace("_", " ")}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current health status based on progress and timeline</p>
                <div className="mt-2">
                  <Progress value={project.progress} showLabel max={100} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Milestones</h3>
              <p className="text-gray-500 text-sm">Milestone tracking would be implemented here with project milestones data.</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Updates</h3>
              <p className="text-gray-500 text-sm">Recent project updates and status changes would be displayed here.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length > 0 ? (
            <DataTable data={assignments} columns={assignmentColumns} keyExtractor={(r: ProjectAssignment) => r.id} emptyState={{ title: "No assignments" }} />
          ) : (
            <div className="card text-center py-12">
              <Users aria-hidden="true" size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-500 mb-4">No employees assigned to this project.</p>
              {canAssign && (
                <button onClick={handleAssign} className="btn btn-primary">
                  <UserPlus aria-hidden="true" size={16} className="mr-2" />
                  Assign Employee
                </button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          {client && (
            <>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Client Information</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Client Code</dt><dd className="font-medium">{client.clientCode}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Country</dt><dd className="font-medium">{client.country}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Industry</dt><dd className="font-medium">{client.industry}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={client.status} /></dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Active Projects</dt><dd className="font-medium">{client.activeProjectCount}</dd></div>
                  </dl>
                  <div className="card bg-gray-50 p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Primary Contact</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{client.primaryContact.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium">{client.primaryContact.email}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium">{client.primaryContact.phone}</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">All Projects for {client.name}</h3>
                <DataTable data={siblingProjects} columns={overviewColumns} keyExtractor={(r: Project) => r.id} emptyState={{ title: "No other projects" }} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {auditLogs.length > 0 ? (
            <DataTable data={auditLogs} columns={activityColumns} keyExtractor={(r: any) => r.id} emptyState={{ title: "No activity" }} />
          ) : (
            <div className="card text-center py-12">
              <Clock aria-hidden="true" size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-500">No audit log entries for this project.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AssignmentModal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setEditAssignment(null); }}
        initialData={editAssignment}
        availableEmployees={availableEmployees}
        onSubmit={(data) => {
          if (editAssignment) {
            updateAssignment(editAssignment.id, data);
          } else {
            createAssignment({ ...data, projectId: project.id });
          }
        }}
      />

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Assignment"
        description="Are you sure you want to remove this employee from the project?"
        size="sm"
      >
        <div className="text-sm text-gray-600">
          This action will remove the employee from this project. You can re-assign them later.
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-4">
          <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleDeleteConfirm} className="btn btn-danger">Remove</button>
        </div>
      </Modal>
    </div>
  );
}