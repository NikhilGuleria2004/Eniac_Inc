import { useUrlState } from "../../lib/useUrlState";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ListTodo, UserPlus, Search, Edit, Trash2 } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { getAssignments, getProjects, getEmployees, createAssignment, updateAssignment, deleteAssignment } from "../../data/mock/repositories";
import { getAssignmentKPIs, filterAssignments, getAssignmentEmployee, getAssignmentProject, getAssignmentClient } from "./assignments";
import { ROUTES } from "../../data/constants";
import { useToast } from "../../components/ui/Toast";
import { hasPermission } from "../../lib/permissions";
import { useAuth } from "../../features/auth/AuthContext";
import type { ProjectAssignment, Employee, Role } from "../../types";

function StatCard({ label, value, icon, variant = "default" }: { label: string; value: number; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "neutral" | "info" }) {
  const bgColors = { default: "bg-gray-50", success: "bg-green-50", warning: "bg-yellow-50", neutral: "bg-gray-100", info: "bg-blue-50" };
  const textColors = { default: "text-gray-900", success: "text-green-700", warning: "text-yellow-700", neutral: "text-gray-700", info: "text-blue-700" };
  return (
    <div className={`card ${bgColors[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-semibold ${textColors[variant]} mt-1`}>{value}</p>
        </div>
        <div className={textColors[variant]}>{icon}</div>
      </div>
    </div>
  );
}

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
    projectId: "",
    role: "",
    allocation: 100,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billable: true,
    status: "ACTIVE" as ProjectAssignment["status"],
  });

  const allProjects = useMemo(() => getProjects(), []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId,
        projectId: initialData.projectId,
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
        projectId: "",
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
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Assignment" : "New Assignment"} size="lg">
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="project">Project *</label>
          <select id="project"
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="form-input"
            required
          >
            <option value="">Select project</option>
            {allProjects
              .filter((p) => p.status === "ACTIVE" || p.status === "PLANNING")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.projectCode})
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">Role *</label>
            <select id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="allocation">Allocation (%) *</label>
            <input id="allocation"
              type="number"
              min="1"
              max="100"
              value={formData.allocation}
              onChange={(e) => setFormData({ ...formData, allocation: Number(e.target.value) })}
              className="form-input"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">Start Date *</label>
            <input id="start-date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">End Date</label>
            <input id="end-date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="form-input"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.billable}
              onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">Billable</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Status</span>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectAssignment["status"] })}
              className="form-input w-auto"
            >
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? "Save Changes" : "Assign Employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AssignmentsDashboardPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useUrlState("q");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectAssignment | null>(null);

  const allAssignments = useMemo(() => getAssignments(), []);
  const allProjects = useMemo(() => getProjects(), []);
  const allEmployees = useMemo(() => getEmployees(), []);

  const kpis = useMemo(() => getAssignmentKPIs(allAssignments), [allAssignments]);

  const filteredAssignments = useMemo(
    () =>
      filterAssignments(allAssignments, {
        search,
        status: statusFilter,
        project: projectFilter,
      }),
    [allAssignments, search, statusFilter, projectFilter]
  );

  const projectOptions = useMemo(
    () => [
      { label: "All Projects", value: "all" },
      ...allProjects
        .filter((p) => p.status === "ACTIVE" || p.status === "PLANNING")
        .map((p) => ({ label: `${p.name} (${p.projectCode})`, value: p.id })),
    ],
    [allProjects]
  );

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    { label: "Active", value: "ACTIVE" },
    { label: "Ended", value: "ENDED" },
    { label: "Pending", value: "PENDING" },
  ];

  const hasActiveFilters = statusFilter !== "all" || projectFilter !== "all" || search !== "";

  const canManage = hasPermission((user?.role as Role) || "EMPLOYEE", "assignment.manage");

  const assignedEmployeeIds = new Set(allAssignments.map((a) => a.employeeId));
  const availableEmployees = useMemo(
    () => allEmployees.filter((e) => e.employmentStatus === "ACTIVE" && !assignedEmployeeIds.has(e.id)),
    [allEmployees, assignedEmployeeIds]
  );

  const handleNewAssignment = () => {
    setEditingAssignment(null);
    setFormOpen(true);
  };

  const handleEditAssignment = (assignment: ProjectAssignment) => {
    setEditingAssignment(assignment);
    setFormOpen(true);
  };

  const handleRemoveAssignment = (assignment: ProjectAssignment) => {
    setDeleteConfirm(assignment);
  };

  const handleFormSubmit = (data: any) => {
    if (editingAssignment) {
      updateAssignment(editingAssignment.id, data);
      addToast("success", "Assignment updated successfully");
    } else {
      createAssignment(data);
      addToast("success", "Assignment created successfully");
    }
    setFormOpen(false);
    setEditingAssignment(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteAssignment(deleteConfirm.id);
      addToast("success", "Assignment removed successfully");
      setDeleteConfirm(null);
    }
  };

  const columns = [
    {
      key: "employee",
      header: "Employee",
      cell: (row: ProjectAssignment) => {
        const emp = getAssignmentEmployee(row);
        return emp ? (
          <div className="flex items-center gap-2">
            <EmployeeAvatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
            <div>
              <span className="font-medium text-gray-900">
                {emp.firstName} {emp.lastName}
              </span>
              <span className="block text-xs text-gray-500">
                {emp.employeeCode} • {emp.designation}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">—</span>
        );
      },
    },
    {
      key: "project",
      header: "Project",
      cell: (row: ProjectAssignment) => {
        const project = getAssignmentProject(row);
        return project ? (
          <Link to={ROUTES.PROJECT_DETAIL(project.id)} className="font-medium text-gray-900 hover:text-accent">
            {project.name}
          </Link>
        ) : (
          <span className="text-gray-500">—</span>
        );
      },
    },
    {
      key: "client",
      header: "Client",
      cell: (row: ProjectAssignment) => {
        const client = getAssignmentClient(row);
        return client ? <span className="text-gray-700">{client.name}</span> : <span className="text-gray-500">—</span>;
      },
    },
    { key: "role", header: "Role", cell: (row: ProjectAssignment) => <span className="text-gray-700">{row.role}</span> },
    {
      key: "allocation",
      header: "Allocation",
      cell: (row: ProjectAssignment) => <span className="text-gray-700">{row.allocation}%</span>,
    },
    {
      key: "startDate",
      header: "Start Date",
      cell: (row: ProjectAssignment) =>
        new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    {
      key: "endDate",
      header: "End Date",
      cell: (row: ProjectAssignment) =>
        row.endDate
          ? new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—",
    },
    {
      key: "billable",
      header: "Billable",
      cell: (row: ProjectAssignment) => <StatusBadge status={row.billable ? "BILLABLE" : "NON_BILLABLE"} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ProjectAssignment) => <StatusBadge status={row.status} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            cell: (row: ProjectAssignment) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAssignment(row);
                  }}
                  className="text-accent hover:text-accent/80"
                  aria-label="Edit"
                  title="Edit"
                >
                  <Edit aria-hidden="true" size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAssignment(row);
                  }}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Remove"
                  title="Remove"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Project Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee assignments across all projects</p>
        </div>
        {canManage && (
          <button onClick={handleNewAssignment} className="btn btn-primary">
            <UserPlus aria-hidden="true" size={16} className="mr-2" />
            New Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={kpis.total} icon={<ListTodo aria-hidden="true" size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<ListTodo aria-hidden="true" size={20} />} variant="success" />
        <StatCard label="Ended" value={kpis.ended} icon={<ListTodo aria-hidden="true" size={20} />} variant="neutral" />
        <StatCard label="Pending" value={kpis.pending} icon={<ListTodo aria-hidden="true" size={20} />} variant="warning" />
        <StatCard label="Billable" value={kpis.billable} icon={<ListTodo aria-hidden="true" size={20} />} variant="info" />
        <StatCard label="Non-Billable" value={kpis.nonBillable} icon={<ListTodo aria-hidden="true" size={20} />} />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only" htmlFor="search">Search</label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input id="search"
                type="text"
                placeholder="Search by employee, project, client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "project", label: "Project", value: projectFilter, options: projectOptions, onChange: setProjectFilter },
              { key: "status", label: "Status", value: statusFilter, options: statusOptions, onChange: setStatusFilter },
            ]}
            onClearAll={() => {
              setSearch("");
              setProjectFilter("all");
              setStatusFilter("all");
            }}
          />
        </div>
        <DataTable
          data={filteredAssignments}
          columns={columns}
          keyExtractor={(row: ProjectAssignment) => row.id}
          emptyState={{
            title: "No assignments found",
            description: hasActiveFilters
              ? "Try adjusting your filters or search terms."
              : "No employee assignments have been recorded yet.",
          }}
        />
      </div>

      <AssignmentModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingAssignment(null);
        }}
        initialData={editingAssignment}
        availableEmployees={editingAssignment ? allEmployees : availableEmployees}
        onSubmit={handleFormSubmit}
      />

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Assignment"
        description="Are you sure you want to remove this assignment?"
        size="sm"
      >
        <div className="text-sm text-gray-600">
          This action will remove the employee from this project assignment. You can re-assign them later.
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-4">
          <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="btn btn-danger">
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
