import type { Client, Project } from "../../types";

export interface ClientKPIs {
  total: number;
  active: number;
  prospect: number;
  inactive: number;
  totalActiveProjects: number;
}

export function computeClientKPIs(clients: Client[], projects: Project[]): ClientKPIs {
  return {
    total: clients.length,
    active: clients.filter((c) => c.status === "ACTIVE").length,
    prospect: clients.filter((c) => c.status === "PROSPECT").length,
    inactive: clients.filter((c) => c.status === "INACTIVE").length,
    totalActiveProjects: projects.filter((p) => p.status === "ACTIVE").length,
  };
}

export interface ClientFilters {
  search: string;
  status: string;
  country: string;
  industry: string;
  tier: string;
}

export function filterClients(clients: Client[], filters: ClientFilters): Client[] {
  const q = filters.search.trim().toLowerCase();
  return clients.filter((c) => {
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.country !== "all" && c.country !== filters.country) return false;
    if (filters.industry !== "all" && c.industry !== filters.industry) return false;
    if (filters.tier !== "all" && c.clientTier !== filters.tier) return false;
    if (q) {
      const hay = `${c.name} ${c.clientCode} ${c.industry} ${c.country} ${c.primaryContact.name} ${c.primaryContact.email}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function uniqueCountries(clients: Client[]): string[] {
  return Array.from(new Set(clients.map((c) => c.country))).sort();
}

export function uniqueIndustries(clients: Client[]): string[] {
  return Array.from(new Set(clients.map((c) => c.industry))).sort();
}
