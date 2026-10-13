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

export async function loadBackendData(): Promise<void> {
  await Promise.resolve();
}

export function getMockUsers() {
  return {};
}
