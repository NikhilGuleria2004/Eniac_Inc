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
  Pagination,
} from "../../types";
import {
  mockEmployees,
  mockClients,
  mockProjects,
  mockAssignments,
  mockDailyLogs,
  mockTimesheets,
  mockInvoices,
  mockInvoiceTemplates,
  mockNotifications,
  mockAuditLogs,
} from "./index";

function makePagination<T>(items: T[], page = 1, pageSize = 100): { data: T[]; pagination: Pagination } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export const getMockUsers = () => ({});

export function getEmployees(): Employee[] {
  return [...mockEmployees];
}

export function getEmployeeById(id: string): Employee | undefined {
  return mockEmployees.find((e) => e.id === id || e.employeeCode === id);
}

export function getBillableEmployees(): Employee[] {
  return mockEmployees.filter((e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE");
}

export function getClients(): Client[] {
  return [...mockClients];
}

export function getClientById(id: string): Client | undefined {
  return mockClients.find((c) => c.id === id || c.clientCode === id);
}

export function getClientsPaginated(page = 1, pageSize = 100) {
  return makePagination(getClients(), page, pageSize);
}

export function getProjects(): Project[] {
  return [...mockProjects];
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id || p.projectCode === id);
}

export function getProjectsByClient(clientId: string): Project[] {
  return mockProjects.filter((p) => p.clientId === clientId);
}

export function getProjectsByManager(managerId: string): Project[] {
  return mockProjects.filter((p) => p.managerId === managerId || p.supervisorId === managerId);
}

export function getAssignments(): ProjectAssignment[] {
  return [...mockAssignments];
}

export function getAssignmentById(id: string): ProjectAssignment | undefined {
  return mockAssignments.find((a) => a.id === id);
}

export function getAssignmentsByEmployee(employeeId: string): ProjectAssignment[] {
  return mockAssignments.filter((a) => a.employeeId === employeeId);
}

export function getActiveAssignmentsByEmployee(employeeId: string): ProjectAssignment[] {
  return mockAssignments.filter((a) => a.employeeId === employeeId && a.status === "ACTIVE");
}

export function getAssignmentsByProject(projectId: string): ProjectAssignment[] {
  return mockAssignments.filter((a) => a.projectId === projectId && a.status === "ACTIVE");
}

export function getDailyLogs(): DailyLog[] {
  return [...mockDailyLogs];
}

export function getDailyLogsByEmployee(employeeId: string): DailyLog[] {
  return mockDailyLogs.filter((d) => d.employeeId === employeeId);
}

export function getDailyLogsByProject(projectId: string): DailyLog[] {
  return mockDailyLogs.filter((d) => d.projectId === projectId);
}

export function getDailyLogsInPeriod(employeeId: string, start: string, end: string): DailyLog[] {
  return mockDailyLogs.filter((d) => d.employeeId === employeeId && d.workDate >= start && d.workDate <= end);
}

export function getTimesheets(): Timesheet[] {
  return [...mockTimesheets];
}

export function getTimesheetById(id: string): Timesheet | undefined {
  return mockTimesheets.find((t) => t.id === id);
}

export function getTimesheetsByEmployee(employeeId: string): Timesheet[] {
  return mockTimesheets.filter((t) => t.employeeId === employeeId);
}

export function getCurrentTimesheetForEmployee(employeeId: string, start: string, end: string): Timesheet | undefined {
  return mockTimesheets.find((t) => t.employeeId === employeeId && t.periodStart === start && t.periodEnd === end);
}

export function getPendingTimesheetReviews(): Timesheet[] {
  return mockTimesheets.filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW");
}

export function getInvoices(): Invoice[] {
  return [...mockInvoices];
}

export function getInvoiceById(id: string): Invoice | undefined {
  return mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
}

export function getInvoicesByClient(clientId: string): Invoice[] {
  return mockInvoices.filter((i) => i.clientId === clientId);
}

export function getInvoiceTemplates(): InvoiceTemplate[] {
  return [...mockInvoiceTemplates];
}

export function getNotificationsByUser(userId: string): Notification[] {
  return [...mockNotifications].filter((n) => n.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getAuditLogs(): AuditLog[] {
  return [...mockAuditLogs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextCode(codes: string[], prefix: string): string {
  let max = 0;
  for (const raw of codes) {
    const n = Number(raw.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function createClient(
  data: Omit<Client, "id" | "clientCode" | "activeProjectCount" | "createdAt" | "updatedAt">
): Client {
  const clientCode = nextCode(mockClients.map((c) => c.clientCode), "CL");
  const newClient: Client = {
    ...data,
    id: clientCode,
    clientCode,
    activeProjectCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mockClients.push(newClient);
  return newClient;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const index = mockClients.findIndex((c) => c.id === id || c.clientCode === id);
  if (index === -1) return undefined;
  mockClients[index] = { ...mockClients[index], ...data, updatedAt: nowIso() };
  return mockClients[index];
}

export function createProject(
  data: Omit<Project, "id" | "projectCode" | "teamSize" | "createdAt" | "updatedAt">
): Project {
  const projectCode = nextCode(mockProjects.map((p) => p.projectCode), "PRJ");
  const newProject: Project = {
    ...data,
    id: projectCode,
    projectCode,
    teamSize: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mockProjects.push(newProject);
  const client = mockClients.find((c) => c.id === data.clientId);
  if (client && newProject.status === "ACTIVE") client.activeProjectCount += 1;
  return newProject;
}

export function updateProject(id: string, data: Partial<Project>): Project | undefined {
  const index = mockProjects.findIndex((p) => p.id === id || p.projectCode === id);
  if (index === -1) return undefined;
  mockProjects[index] = { ...mockProjects[index], ...data, updatedAt: nowIso() };
  return mockProjects[index];
}

export function createAssignment(
  data: Omit<ProjectAssignment, "id" | "createdAt" | "updatedAt">
): ProjectAssignment {
  const newAssignment: ProjectAssignment = {
    ...data,
    id: nextCode(mockAssignments.map((a) => a.id), "PA"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mockAssignments.push(newAssignment);
  const project = mockProjects.find((p) => p.id === data.projectId);
  if (project && data.status === "ACTIVE") project.teamSize += 1;
  return newAssignment;
}

export function updateAssignment(id: string, data: Partial<ProjectAssignment>): ProjectAssignment | undefined {
  const index = mockAssignments.findIndex((a) => a.id === id);
  if (index === -1) return undefined;
  const prevStatus = mockAssignments[index].status;
  mockAssignments[index] = { ...mockAssignments[index], ...data, updatedAt: nowIso() };
  applyTeamSizeDelta(mockAssignments[index], prevStatus);
  return mockAssignments[index];
}

export function endAssignment(id: string, endDate?: string): ProjectAssignment | undefined {
  const index = mockAssignments.findIndex((a) => a.id === id);
  if (index === -1) return undefined;
  const prevStatus = mockAssignments[index].status;
  mockAssignments[index] = {
    ...mockAssignments[index],
    status: "ENDED",
    endDate: endDate ?? nowIso(),
    updatedAt: nowIso(),
  };
  applyTeamSizeDelta(mockAssignments[index], prevStatus);
  return mockAssignments[index];
}

function applyTeamSizeDelta(assignment: ProjectAssignment, prevStatus: string): void {
  const project = mockProjects.find((p) => p.id === assignment.projectId);
  if (!project) return;
  const wasActive = prevStatus === "ACTIVE";
  const isActive = assignment.status === "ACTIVE";
  if (!wasActive && isActive) project.teamSize += 1;
  if (wasActive && !isActive && project.teamSize > 0) project.teamSize -= 1;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextDailyLogId(): string {
  let max = 0;
  for (const d of mockDailyLogs) {
    const n = Number(d.id.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `DL-${max + 1}`;
}

export interface CreateDailyLogInput {
  employeeId: string;
  projectId: string;
  workDate: string;
  taskCategory: DailyLog["taskCategory"];
  description: string;
  regularHours: number;
  overtimeHours: number;
  billable: boolean;
  billingType: DailyLog["billingType"];
  status: DailyLog["status"];
  tags?: string[];
}

export function createDailyLog(data: CreateDailyLogInput): DailyLog {
  const emp = mockEmployees.find((e) => e.id === data.employeeId || e.employeeCode === data.employeeId);
  const proj = mockProjects.find((p) => p.id === data.projectId);
  const log: DailyLog = {
    id: nextDailyLogId(),
    employeeId: data.employeeId,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : data.employeeId,
    projectId: data.projectId,
    projectName: proj?.name ?? "",
    workDate: data.workDate,
    dayOfWeek: DAY_NAMES[new Date(`${data.workDate}T00:00:00`).getDay()],
    taskCategory: data.taskCategory,
    description: data.description,
    regularHours: data.regularHours,
    overtimeHours: data.overtimeHours,
    totalHours: data.regularHours + data.overtimeHours,
    billable: data.billable,
    billingType: data.billingType,
    status: data.status,
    tags: data.tags,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mockDailyLogs.push(log);
  return log;
}

export function updateDailyLog(id: string, data: Partial<DailyLog>): DailyLog | undefined {
  const index = mockDailyLogs.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  const prev = mockDailyLogs[index];
  const merged: DailyLog = { ...prev, ...data, updatedAt: nowIso() };
  merged.totalHours = merged.regularHours + merged.overtimeHours;
  if (merged.workDate !== prev.workDate) {
    merged.dayOfWeek = DAY_NAMES[new Date(`${merged.workDate}T00:00:00`).getDay()];
  }
  mockDailyLogs[index] = merged;
  return merged;
}
