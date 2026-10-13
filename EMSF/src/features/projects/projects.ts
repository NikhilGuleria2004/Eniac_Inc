import type { Project, ProjectAssignment, Client, Employee } from "../../types";
import { getAssignments, getClients, getEmployees } from "../../data/mock/repositories";

export interface ProjectKPIs {
  total: number;
  active: number;
  planning: number;
  atRisk: number;
  completed: number;
  onHold: number;
  cancelled: number;
}

export interface ProjectFilters {
  search: string;
  status: string;
  client: string;
  health: string;
}

export function computeProjectKPIs(projects: Project[]): ProjectKPIs {
  return {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    planning: projects.filter((p) => p.status === "PLANNING").length,
    atRisk: projects.filter((p) => p.health === "AT_RISK").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    onHold: projects.filter((p) => p.status === "ON_HOLD").length,
    cancelled: projects.filter((p) => p.status === "CANCELLED").length,
  };
}

export function filterProjects(projects: Project[], filters: ProjectFilters, clients: Client[]): Project[] {
  return projects.filter((project) => {
    const client = clients.find((c) => c.id === project.clientId);
    const clientName = client?.name.toLowerCase() || "";
    const matchesSearch =
      filters.search === "" ||
      project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(filters.search.toLowerCase()) ||
      clientName.includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === "all" || project.status === filters.status;
    const matchesClient = filters.client === "all" || project.clientId === filters.client;
    const matchesHealth = filters.health === "all" || project.health === filters.health;

    return matchesSearch && matchesStatus && matchesClient && matchesHealth;
  });
}

export function getProjectAssignments(projectId: string): ProjectAssignment[] {
  return getAssignments().filter((a) => a.projectId === projectId);
}

export function getActiveAssignmentCount(projectId: string): number {
  return getProjectAssignments(projectId).filter((a) => a.status === "ACTIVE").length;
}

export function getUniqueClients(clients: Client[]): { id: string; name: string }[] {
  return clients.map((c) => ({ id: c.id, name: c.name }));
}

export function getUniqueStatuses(): Project["status"][] {
  return ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
}

export function getUniqueHealths(): Project["health"][] {
  return ["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"];
}

export function getProjectManager(project: Project): Employee | undefined {
  return getEmployees().find((e) => e.id === project.managerId);
}

export function getProjectSupervisor(project: Project): Employee | undefined {
  if (!project.supervisorId) return undefined;
  return getEmployees().find((e) => e.id === project.supervisorId);
}

export function getProjectClient(project: Project): Client | undefined {
  return getClients().find((c) => c.id === project.clientId);
}

export function getAvailableEmployees(projectId: string): Employee[] {
  const assignedEmployeeIds = new Set(getProjectAssignments(projectId).map((a) => a.employeeId));
  return getEmployees().filter((e) => e.employmentStatus === "ACTIVE" && !assignedEmployeeIds.has(e.id));
}

export function computeTeamStats(assignments: ProjectAssignment[]): {
  total: number;
  billable: number;
  nonBillable: number;
  avgAllocation: number;
} {
  const active = assignments.filter((a) => a.status === "ACTIVE");
  if (active.length === 0) return { total: 0, billable: 0, nonBillable: 0, avgAllocation: 0 };
  return {
    total: active.length,
    billable: active.filter((a) => a.billable).length,
    nonBillable: active.filter((a) => !a.billable).length,
    avgAllocation: Math.round(active.reduce((sum, a) => sum + a.allocation, 0) / active.length),
  };
}

export function getProjectProgressHealth(project: Project): { label: string; variant: string } {
  const health = project.health;
  const labels: Record<Project["health"], string> = {
    ON_TRACK: "On Track",
    AT_RISK: "At Risk",
    DELAYED: "Delayed",
    COMPLETED: "Completed",
  };
  const variants: Record<Project["health"], string> = {
    ON_TRACK: "badge-success",
    AT_RISK: "badge-warning",
    DELAYED: "badge-danger",
    COMPLETED: "badge-success",
  };
  return { label: labels[health], variant: variants[health] };
}

export function getProjectStatusInfo(project: Project): { label: string; variant: string } {
  const status = project.status;
  const labels: Record<Project["status"], string> = {
    PLANNING: "Planning",
    ACTIVE: "Active",
    ON_HOLD: "On Hold",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  const variants: Record<Project["status"], string> = {
    PLANNING: "badge-info",
    ACTIVE: "badge-success",
    ON_HOLD: "badge-warning",
    COMPLETED: "badge-success",
    CANCELLED: "badge-danger",
  };
  return { label: labels[status], variant: variants[status] };
}