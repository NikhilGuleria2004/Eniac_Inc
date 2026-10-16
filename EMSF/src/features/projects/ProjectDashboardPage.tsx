import { useUrlState } from "../../lib/useUrlState";
import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, TrendingUp, AlertTriangle, CheckCircle, PauseCircle, Plus, Search } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Progress } from "../../components/ui/Progress";
import { getProjects, createProject, updateProject, getClients, getEmployees } from "../../data/mock/repositories";
import { computeProjectKPIs, filterProjects, getUniqueClients, getUniqueStatuses, getUniqueHealths, getProjectManager } from "./projects";
import { ROUTES } from "../../data/constants";
import { useToast } from "../../components/ui/Toast";
import type { Project, Client } from "../../types";

export function ProjectDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useUrlState("q");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const allProjects = useMemo(() => getProjects(), []);
  const allClients = useMemo(() => getClients(), []);

  const kpis = useMemo(() => computeProjectKPIs(allProjects), [allProjects]);

  const filteredProjects = useMemo(() => filterProjects(allProjects, { search, status: statusFilter, client: clientFilter, health: healthFilter }, allClients), [allProjects, allClients, search, statusFilter, clientFilter, healthFilter]);

  const clientOptions = useMemo(() => [{ label: "All", value: "all" }, ...getUniqueClients(allClients).map((c) => ({ label: c.name, value: c.id }))], [allClients]);
  const statusOptions = [{ label: "All", value: "all" }, ...getUniqueStatuses().map((s) => ({ label: s, value: s }))];
  const healthOptions = [{ label: "All", value: "all" }, ...getUniqueHealths().map((h) => ({ label: h, value: h }))];

  const hasActiveFilters = statusFilter !== "all" || clientFilter !== "all" || healthFilter !== "all" || search !== "";

  const handleNewProject = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingProject) {
      updateProject(editingProject.id, data);
      addToast("success", "Project updated successfully");
    } else {
      const newProject = createProject(data);
      addToast("success", "Project created successfully");
      navigate(ROUTES.PROJECT_DETAIL(newProject.id));
    }
    setFormOpen(false);
    setEditingProject(null);
  };

  const columns = [
    {
      key: "name",
      header: "Project",
      cell: (row: Project) => (
        <Link to={ROUTES.PROJECT_DETAIL(row.id)} className="font-medium text-gray-900 hover:text-accent">
          {row.name}
        </Link>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (row: Project) => {
        const client = allClients.find((c) => c.id === row.clientId);
        return client ? client.name : "—";
      },
    },
    {
      key: "manager",
      header: "Manager",
      cell: (row: Project) => {
        const manager = getProjectManager(row);
        return manager ? `${manager.firstName} ${manager.lastName}` : "—";
      },
    },
    { key: "teamSize", header: "Team Size", cell: (row: Project) => row.teamSize },
    { key: "startDate", header: "Start", cell: (row: Project) => new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "endDate", header: "End", cell: (row: Project) => new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    {
      key: "progress",
      header: "Progress",
      cell: (row: Project) => <Progress value={row.progress} showLabel max={100} className="w-32" />,
    },
    { key: "status", header: "Status", cell: (row: Project) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Project) => (
        <button onClick={(e) => { e.stopPropagation(); handleEditProject(row); }} className="text-accent hover:underline text-sm">Edit</button>
      ),
    },
  ];

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Project Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage projects, track progress, and oversee team allocations</p>
        </div>
        <button onClick={handleNewProject} className="btn btn-primary">
          <Plus aria-hidden="true" size={16} className="mr-2" />
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total Projects" value={kpis.total} icon={<Briefcase aria-hidden="true" size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<TrendingUp aria-hidden="true" size={20} />} variant="success" />
        <StatCard label="Planning" value={kpis.planning} icon={<Briefcase aria-hidden="true" size={20} />} variant="info" />
        <StatCard label="At Risk" value={kpis.atRisk} icon={<AlertTriangle aria-hidden="true" size={20} />} variant="warning" />
        <StatCard label="Completed" value={kpis.completed} icon={<CheckCircle aria-hidden="true" size={20} />} variant="success" />
        <StatCard label="On Hold" value={kpis.onHold} icon={<PauseCircle aria-hidden="true" size={20} />} variant="neutral" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only" htmlFor="search">Search</label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input id="search"
                type="text"
                placeholder="Search by name, code, client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "status", label: "Status", value: statusFilter, options: statusOptions, onChange: setStatusFilter },
              { key: "client", label: "Client", value: clientFilter, options: clientOptions, onChange: setClientFilter },
              { key: "health", label: "Health", value: healthFilter, options: healthOptions, onChange: setHealthFilter },
            ]}
            onClearAll={() => { setSearch(""); setStatusFilter("all"); setClientFilter("all"); setHealthFilter("all"); }}
          />
        </div>
        <DataTable
          data={filteredProjects}
          columns={columns}
          keyExtractor={(row) => row.id}
          emptyState={{
            title: "No projects found",
            description: hasActiveFilters ? "Try adjusting your filters or search terms." : "Create your first project to get started.",
          }}
        />
      </div>

      <ProjectFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingProject(null); }} initialData={editingProject} onSubmit={handleFormSubmit} clients={allClients} />
    </div>
  );
}

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

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData: Project | null;
  onSubmit: (data: any) => void;
  clients: Client[];
}

function ProjectFormModal({ open, onClose, initialData, onSubmit, clients }: ProjectFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    managerId: "emp-3",
    supervisorId: "emp-4",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "PLANNING" as Project["status"],
    health: "ON_TRACK" as Project["health"],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        clientId: initialData.clientId,
        managerId: initialData.managerId,
        supervisorId: initialData.supervisorId || "",
        description: initialData.description,
        startDate: initialData.startDate,
        endDate: initialData.endDate,
        status: initialData.status,
        health: initialData.health,
      });
    } else {
      setFormData({
        name: "",
        clientId: "",
        managerId: "emp-3",
        supervisorId: "emp-4",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "PLANNING" as Project["status"],
        health: "ON_TRACK" as Project["health"],
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const managers = getEmployees().filter((e) => ["ADMIN", "MANAGER", "SUPERVISOR"].includes(e.role));
  const statuses = getUniqueStatuses();
  const healths = getUniqueHealths();

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Project" : "Create Project"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="project-name">Project Name *</label>
          <input id="project-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="client">Client *</label>
            <select id="client" value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })} className="form-input" required>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="project-manager">Project Manager *</label>
            <select id="project-manager" value={formData.managerId} onChange={(e) => setFormData({ ...formData, managerId: e.target.value })} className="form-input" required>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="supervisor">Supervisor</label>
            <select id="supervisor" value={formData.supervisorId} onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })} className="form-input">
              <option value="">None</option>
              {managers.filter((m) => m.id !== formData.managerId).map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">Status *</label>
            <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Project["status"] })} className="form-input" required>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="health">Health *</label>
            <select id="health" value={formData.health} onChange={(e) => setFormData({ ...formData, health: e.target.value as Project["health"] })} className="form-input" required>
              {healths.map((h) => <option key={h} value={h}>{h.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">Start Date *</label>
            <input id="start-date" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="form-input" required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">End Date *</label>
            <input id="end-date" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="form-input" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
          <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-input" rows={3} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">{initialData ? "Save Changes" : "Create Project"}</button>
        </div>
      </form>
    </Modal>
  );
}