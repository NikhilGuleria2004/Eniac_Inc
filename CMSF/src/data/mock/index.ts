import type {
  Employee,
  Client,
  Project,
  ProjectAssignment,
  DailyLog,
  Timesheet,
  Invoice,
  InvoiceTemplate,
  Notification,
  AuditLog,
} from "../../types";
import { generateSeed } from "./generate";
import { apiFetch, USE_API } from "../../lib/api";
import {
  toClient,
  toProject,
  toAssignment,
  toDailyLog,
  toTimesheet,
  toInvoice,
  toInvoiceTemplate,
  toEmployee,
} from "./adapters";

const seed = generateSeed();

export const mockEmployees: Employee[] = seed.employees;
export const mockClients: Client[] = seed.clients;
export const mockProjects: Project[] = seed.projects;
export const mockAssignments: ProjectAssignment[] = seed.assignments;
export const mockDailyLogs: DailyLog[] = seed.dailyLogs;
export const mockTimesheets: Timesheet[] = seed.timesheets;
export const mockInvoices: Invoice[] = seed.invoices;
export const mockInvoiceTemplates: InvoiceTemplate[] = seed.invoiceTemplates;
export const mockNotifications: Notification[] = seed.notifications;
export const mockAuditLogs: AuditLog[] = seed.auditLogs;

function replaceArray<T>(target: T[], source: T[]): void {
  target.length = 0;
  target.push(...source);
}

/**
 * Phase 8 integration: replaces the in-memory arrays with live EMSB data.
 *
 * Reads stay synchronous downstream (components unchanged — CMSB.md §56).
 * If the API is disabled or unreachable the arrays keep their generated
 * seed, so the demo works with or without a backend running.
 */
export async function loadBackendData(): Promise<void> {
  if (!USE_API) return;

  const load = async <T,>(path: string, map: (dto: Record<string, unknown>) => T): Promise<T[] | null> => {
    try {
      const res = await apiFetch<T[]>(`${path}?pageSize=100`, { signal: AbortSignal.timeout(5000) });
      return res.data.map((dto) => map(dto as unknown as Record<string, unknown>));
    } catch (error) {
      console.warn(`loadBackendData: ${path} failed, keeping mock data`, error);
      return null;
    }
  };

  const [employees, clients, projects, assignments] = await Promise.all([
    load<Employee>("/employees", toEmployee),
    load<Client>("/clients", toClient),
    load<Project>("/projects", toProject),
    load<ProjectAssignment>("/assignments", toAssignment),
  ]);
  if (employees) replaceArray(mockEmployees, employees);
  if (clients) replaceArray(mockClients, clients);
  if (projects) replaceArray(mockProjects, projects);
  if (assignments) replaceArray(mockAssignments, assignments);

  // CMS-specific collections exist once the EMSB CMS modules are deployed
  // (CMSB.md Phases 2-6); they fall back to the generated seed otherwise.
  const [dailyLogs, timesheets, invoices, templates] = await Promise.all([
    load<DailyLog>("/daily-logs", toDailyLog),
    load<Timesheet>("/timesheets", toTimesheet),
    load<Invoice>("/invoices", toInvoice),
    load<InvoiceTemplate>("/invoice-templates", toInvoiceTemplate),
  ]);
  if (dailyLogs) replaceArray(mockDailyLogs, dailyLogs);
  if (timesheets) replaceArray(mockTimesheets, timesheets);
  if (invoices) replaceArray(mockInvoices, invoices);
  if (templates) replaceArray(mockInvoiceTemplates, templates);
}

export function getMockUsers() {
  return {};
}

