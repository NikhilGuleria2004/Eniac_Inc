import type { Client, Project } from "../../types";
import { getProjects } from "../../data/mock/repositories";

export interface ClientKPIs {
  total: number;
  active: number;
  prospect: number;
  inactive: number;
  totalActiveProjects: number;
}

export interface ClientFilters {
  search: string;
  status: string;
  country: string;
  industry: string;
}

export function computeClientKPIs(clients: Client[], projects: Project[]): ClientKPIs {
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const projectCounts = new Map<string, number>();
  for (const p of activeProjects) {
    projectCounts.set(p.clientId, (projectCounts.get(p.clientId) || 0) + 1);
  }

  return {
    total: clients.length,
    active: clients.filter((c) => c.status === "ACTIVE").length,
    prospect: clients.filter((c) => c.status === "PROSPECT").length,
    inactive: clients.filter((c) => c.status === "INACTIVE" || c.status === "SUSPENDED" || c.status === "CLOSED").length,
    totalActiveProjects: activeProjects.length,
  };
}

export function filterClients(clients: Client[], filters: ClientFilters): Client[] {
  return clients.filter((client) => {
    const name = client.name.toLowerCase();
    const code = client.clientCode.toLowerCase();
    const contact = client.primaryContact.name.toLowerCase();
    const email = client.primaryContact.email.toLowerCase();
    const matchesSearch =
      filters.search === "" ||
      name.includes(filters.search.toLowerCase()) ||
      code.includes(filters.search.toLowerCase()) ||
      contact.includes(filters.search.toLowerCase()) ||
      email.includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === "all" || client.status === filters.status;
    const matchesCountry = filters.country === "all" || client.country === filters.country;
    const matchesIndustry = filters.industry === "all" || client.industry === filters.industry;

    return matchesSearch && matchesStatus && matchesCountry && matchesIndustry;
  });
}

export function getClientProjects(clientId: string): Project[] {
  const projects = getProjects();
  return projects.filter((p) => p.clientId === clientId);
}

export function getActiveProjectCount(clientId: string): number {
  return getClientProjects(clientId).filter((p) => p.status === "ACTIVE").length;
}

export function getUniqueCountries(clients: Client[]): string[] {
  return [...new Set(clients.map((c) => c.country))].sort();
}

export function getUniqueIndustries(clients: Client[]): string[] {
  return [...new Set(clients.map((c) => c.industry))].sort();
}

export function getUniqueStatuses(): Client["status"][] {
  return ["ACTIVE", "PROSPECT", "INACTIVE", "SUSPENDED", "CLOSED"];
}

export function computeClientProgress(projects: Project[]): { total: number; completed: number; progress: number } {
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  if (activeProjects.length === 0) return { total: 0, completed: 0, progress: 0 };
  const totalProgress = activeProjects.reduce((sum, p) => sum + p.progress, 0);
  return {
    total: activeProjects.length,
    completed: activeProjects.filter((p) => p.progress === 100).length,
    progress: Math.round(totalProgress / activeProjects.length),
  };
}