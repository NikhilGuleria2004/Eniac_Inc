import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Activity, AlertTriangle, Clock, CheckCircle2, Plus, Search } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { getProjects, getEmployees, getActiveAssignmentsByEmployee } from "../../data/mock/repositories";
import { useAuth } from "../../features/auth/AuthContext";
import { PROJECT_STATUSES, PROJECT_HEALTH, ROUTES } from "../../data/constants";
import { computeProjectKPIs, filterProjects, uniqueClients, uniqueManagers } from "./projects";
import { hasPermission } from "../../lib/permissions";
import { ProjectFormModal } from "./ProjectFormModal";
import type { Project } from "../../types";

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

export function ProjectDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateProject = hasPermission(user?.role ?? "EMPLOYEE", "project.create");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [client, setClient] = useState("all");
  const [health, setHealth] = useState("all");
  const [manager, setManager] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const allProjects = useMemo(() => getProjects(), []);
  const employees = useMemo(() => getEmployees(), []);
  const visibleProjects = useMemo(() => {
    if (user?.role === "EMPLOYEE") {
      const assigned = new Set(getActiveAssignmentsByEmployee(user.employeeId ?? "").map((a) => a.projectId));
      return allProjects.filter((p) => assigned.has(p.id));
    }
    return allProjects;
  }, [allProjects, user?.role, user?.employeeId]);
  const kpis = useMemo(() => computeProjectKPIs(visibleProjects), [visibleProjects]);
  const filtered = useMemo(() => filterProjects(visibleProjects, { search, status, client, health, manager }), [visibleProjects, search, status, client, health, manager]);
  const hasFilters = status !== "all" || client !== "all" || health !== "all" || manager !== "all" || search !== "";

  const clientOptions = [{ label: "All Clients", value: "all" }, ...uniqueClients(visibleProjects).map((c) => ({ label: c.name, value: c.id }))];
  const managerOptions = [{ label: "All Managers", value: "all" }, ...uniqueManagers(visibleProjects).map((id) => {
    const emp = employees.find((e) => e.id === id);
    return { label: emp ? `${emp.firstName} ${emp.lastName}` : id, value: id };
  })];
  const statusOptions = [{ label: "All Statuses", value: "all" }, ...PROJECT_STATUSES.map((s) => ({ label: s.replace("_", " "), value: s }))];
  const healthOptions = [{ label: "All Health", value: "all" }, ...PROJECT_HEALTH.map((h) => ({ label: h.replace("_", " "), value: h }))];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Project Management"
        subtitle="Track engagement progress, teams and client alignment"
        actions={
          canCreateProject ? (
            <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} className="mr-2" />
              New Project
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Projects" value={kpis.total} icon={<FolderKanban size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<Activity size={20} />} variant="info" />
        <StatCard label="On Track" value={kpis.onTrack} icon={<CheckCircle2 size={20} />} variant="success" />
        <StatCard label="At Risk" value={kpis.atRisk} icon={<AlertTriangle size={20} />} variant="warning" />
        <StatCard label="Delayed" value={kpis.delayed} icon={<Clock size={20} />} variant="danger" />
        <StatCard label="Completed" value={kpis.completed} icon={<CheckCircle2 size={20} />} variant="default" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, client..." className="form-input pl-10" />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={client} onChange={(e) => setClient(e.target.value)}>{clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={health} onChange={(e) => setHealth(e.target.value)}>{healthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={manager} onChange={(e) => setManager(e.target.value)}>{managerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
          </div>
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => navigate(ROUTES.PROJECT_DETAIL.replace(":projectId", p.id))}
          emptyState={{ title: "No projects found", description: hasFilters ? "Try adjusting your filters or search." : "Create your first project to get started." }}
          columns={[
            { key: "name", header: "Project", cell: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
            { key: "clientName", header: "Client", cell: (p) => p.clientName },
            { key: "managerId", header: "Manager", cell: (p) => {
              const m = employees.find((e) => e.id === p.managerId);
              return m ? `${m.firstName} ${m.lastName}` : "—";
            } },
            { key: "teamSize", header: "Team Size", cell: (p) => p.teamSize },
            { key: "startDate", header: "Start", cell: (p) => p.startDate },
            { key: "endDate", header: "End", cell: (p) => p.endDate },
            { key: "progress", header: "Progress", cell: (p) => (
              <div className="flex items-center gap-2">
                <Progress value={p.progress} className="w-16" />
                <span className="text-xs text-gray-500">{p.progress}%</span>
              </div>
            ) },
            { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} kind="project" label={p.status} /> },
            { key: "health", header: "Health", cell: (p) => <HealthBadge health={p.health} /> },
          ]}
        />
      </div>

      <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
