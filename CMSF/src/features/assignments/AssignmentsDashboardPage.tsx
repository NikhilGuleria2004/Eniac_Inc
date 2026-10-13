import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, Activity, Clock, Archive, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getAssignments,
  getProjects,
  getEmployees,
  getClients,
  endAssignment,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import type { ProjectAssignment } from "../../types";

export function AssignmentsDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState("all");
  const [project, setProject] = useState("all");
  const [client, setClient] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [billable, setBillable] = useState("all");

  const employees = useMemo(() => getEmployees(), []);
  const projects = useMemo(() => getProjects(), []);
  const clients = useMemo(() => getClients(), []);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, { name: p.name, clientId: p.clientId, clientName: p.clientName }])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const scopedProjectIds = useMemo(() => {
    if (user?.role === "SUPERVISOR") {
      return new Set(
        projects
          .filter((p) => p.managerId === user.employeeId || p.supervisorId === user.employeeId)
          .map((p) => p.id)
      );
    }
    return null;
  }, [projects, user?.role, user?.employeeId]);

  const baseAssignments = useMemo(() => {
    const all = getAssignments();
    return scopedProjectIds ? all.filter((a) => scopedProjectIds.has(a.projectId)) : all;
  }, [scopedProjectIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseAssignments.filter((a) => {
      const proj = projectMap.get(a.projectId);
      const pname = proj?.name ?? "";
      const cname = proj?.clientName ?? "";
      const ename = employeeMap.get(a.employeeId) ?? "";
      if (employee !== "all" && a.employeeId !== employee) return false;
      if (project !== "all" && a.projectId !== project) return false;
      if (client !== "all" && proj?.clientId !== client) return false;
      if (role !== "all" && a.role !== role) return false;
      if (status !== "all" && a.status !== status) return false;
      if (billable !== "all" && String(a.billable) !== billable) return false;
      if (q && !`${ename} ${pname} ${cname} ${a.role}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [baseAssignments, search, employee, project, client, role, status, billable, employeeMap, projectMap]);

  const kpis = {
    total: baseAssignments.length,
    active: baseAssignments.filter((a) => a.status === "ACTIVE").length,
    pending: baseAssignments.filter((a) => a.status === "PENDING").length,
    ended: baseAssignments.filter((a) => a.status === "ENDED").length,
  };

  const hasFilters = employee !== "all" || project !== "all" || client !== "all" || role !== "all" || status !== "all" || billable !== "all" || search !== "";

  const employeeOptions = [{ label: "All Employees", value: "all" }, ...Array.from(new Set(baseAssignments.map((a) => a.employeeId))).map((id) => ({ label: employeeMap.get(id) ?? id, value: id }))];
  const projectOptions = [{ label: "All Projects", value: "all" }, ...Array.from(new Set(baseAssignments.map((a) => a.projectId))).map((id) => ({ label: projectMap.get(id)?.name ?? id, value: id }))];
  const clientOptions = [{ label: "All Clients", value: "all" }, ...Array.from(new Set(baseAssignments.map((a) => projectMap.get(a.projectId)?.clientId).filter((x): x is string => Boolean(x)))).map((id) => ({ label: clientMap.get(id) ?? id, value: id }))];
  const roleOptions = [{ label: "All Roles", value: "all" }, ...(Array.from(new Set(baseAssignments.map((a) => a.role))) as string[]).sort().map((r) => ({ label: r, value: r }))];
  const statusOptions = [{ label: "All Statuses", value: "all" }, { label: "Active", value: "ACTIVE" }, { label: "Pending", value: "PENDING" }, { label: "Ended", value: "ENDED" }];
  const billableOptions = [{ label: "Any", value: "all" }, { label: "Billable", value: "true" }, { label: "Non-billable", value: "false" }];

  const handleEnd = (a: ProjectAssignment) => {
    endAssignment(a.id);
    addToast("success", `${employeeMap.get(a.employeeId) ?? "Employee"} assignment ended`);
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Project Assignments"
        subtitle={scopedProjectIds ? "Assignments across your supervised projects" : "Team-to-project allocation across all clients"}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Assignments" value={kpis.total} icon={<ListChecks size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<Activity size={20} />} variant="success" />
        <StatCard label="Pending" value={kpis.pending} icon={<Clock size={20} />} variant="warning" />
        <StatCard label="Ended" value={kpis.ended} icon={<Archive size={20} />} />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by employee, project, role, client..." className="form-input pl-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)}>{employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={project} onChange={(e) => setProject(e.target.value)}>{projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={client} onChange={(e) => setClient(e.target.value)}>{clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>{roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={billable} onChange={(e) => setBillable(e.target.value)}>{billableOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
          </div>
          {hasFilters && (
            <button className="self-start text-sm text-accent hover:underline" onClick={() => { setSearch(""); setEmployee("all"); setProject("all"); setClient("all"); setRole("all"); setStatus("all"); setBillable("all"); }}>Clear all filters</button>
          )}
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(a) => a.id}
          emptyState={{ title: "No assignments found", description: hasFilters ? "Try adjusting your filters or search." : "No assignments have been created yet." }}
          columns={[
            { key: "employee", header: "Employee", cell: (a) => <span className="font-medium text-gray-900">{employeeMap.get(a.employeeId) ?? a.employeeId}</span> },
            { key: "project", header: "Project", cell: (a) => projectMap.get(a.projectId)?.name ?? a.projectId },
            { key: "client", header: "Client", cell: (a) => projectMap.get(a.projectId)?.clientName ?? "—" },
            { key: "role", header: "Role", cell: (a) => a.role },
            { key: "allocation", header: "Allocation %", cell: (a) => `${a.allocation}%` },
            { key: "billable", header: "Billable", cell: (a) => (a.billable ? <StatusBadge status="ACTIVE" label="Yes" /> : <StatusBadge status="INACTIVE" label="No" />) },
            { key: "startDate", header: "Start Date", cell: (a) => a.startDate },
            { key: "endDate", header: "End Date", cell: (a) => a.endDate ?? "—" },
            { key: "status", header: "Status", cell: (a) => (
              a.status === "ACTIVE" ? <StatusBadge status="ACTIVE" label="Active" />
              : a.status === "PENDING" ? <StatusBadge status="SUSPENDED" label="Pending" />
              : <StatusBadge status="CLOSED" label="Ended" />
            ) },
            {
              key: "actions",
              header: "Actions",
              cell: (a) => (
                <div className="flex items-center gap-2">
                  <button className="text-accent hover:underline text-sm" onClick={(e) => { e.stopPropagation(); navigate(ROUTES.PROJECT_DETAIL.replace(":projectId", a.projectId)); }}><ExternalLink size={14} className="inline" /> Project</button>
                  {a.status === "ACTIVE" && (
                    <button className="text-gray-500 hover:text-danger text-sm" onClick={(e) => { e.stopPropagation(); handleEnd(a); }}>End</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
