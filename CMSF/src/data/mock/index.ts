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

export const mockEmployees: Employee[] = [];
export const mockClients: Client[] = [];
export const mockProjects: Project[] = [];
export const mockAssignments: ProjectAssignment[] = [];
export const mockDailyLogs: DailyLog[] = [];
export const mockTimesheets: Timesheet[] = [];
export const mockInvoices: Invoice[] = [];
export const mockInvoiceTemplates: InvoiceTemplate[] = [];
export const mockNotifications: Notification[] = [];
export const mockAuditLogs: AuditLog[] = [];

export async function loadBackendData(): Promise<void> {
  await Promise.resolve();
}

export function getMockUsers() {
  return {};
}
