import type { Project } from "../../types";

export interface ProjectKPIs {
  total: number;
  active: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  completed: number;
}

export function computeProjectKPIs(projects: Project[]): ProjectKPIs {
  return {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    onTrack: projects.filter((p) => p.health === "ON_TRACK").length,
    atRisk: projects.filter((p) => p.health === "AT_RISK").length,
    delayed: projects.filter((p) => p.health === "DELAYED").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
  };
}

export interface ProjectFilters {
  search: string;
  status: string;
  client: string;
  health: string;
  manager: string;
}

export function filterProjects(projects: Project[], filters: ProjectFilters): Project[] {
  const q = filters.search.trim().toLowerCase();
  return projects.filter((p) => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.client !== "all" && p.clientId !== filters.client) return false;
    if (filters.health !== "all" && p.health !== filters.health) return false;
    if (filters.manager !== "all" && p.managerId !== filters.manager) return false;
    if (q) {
      const hay = `${p.name} ${p.projectCode} ${p.clientName} ${p.managerId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function uniqueClients(projects: Project[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const p of projects) map.set(p.clientId, p.clientName);
  return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function uniqueManagers(projects: Project[]): string[] {
  return Array.from(new Set(projects.map((p) => p.managerId)));
}
