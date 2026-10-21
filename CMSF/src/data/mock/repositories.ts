import type {
  Employee,
  Client,
  Project,
  ProjectAssignment,
  DailyLog,
  Timesheet,
  TimesheetProjectBreakdown,
  Invoice,
  InvoiceLineItem,
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
import { apiFetch, USE_API } from "../../lib/api";

function apiWrite(path: string, method: string, payload: unknown): void {
  if (!USE_API) return;
  void apiFetch(path, { method, body: JSON.stringify(payload) }).catch((error) => {
    console.warn(`API write failed: ${method} ${path}`, error);
  });
}

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

/**
 * Inserts or replaces an invoice in the local store with the server's copy.
 * Used by the invoice API layer so lists/details reflect server-assigned ids
 * and totals immediately after a write, without waiting for a full re-hydrate.
 */
export function upsertInvoiceLocal(invoice: Invoice): void {
  const index = mockInvoices.findIndex((i) => i.id === invoice.id);
  if (index >= 0) mockInvoices[index] = invoice;
  else mockInvoices.push(invoice);
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

export function getNotifications(): Notification[] {
  return [...mockNotifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function markNotificationRead(id: string): void {
  const n = mockNotifications.find((x) => x.id === id);
  if (n && !n.read) {
    n.read = true;
    n.readAt = nowIso();
  }
}

export function markAllNotificationsRead(userId: string): void {
  for (const n of mockNotifications) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      n.readAt = nowIso();
    }
  }
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
  logAudit({ entity: "CLIENT", action: "client.created", entityId: newClient.clientCode, description: `Client ${newClient.name} created` });
  apiWrite("/clients", "POST", {
    code: newClient.clientCode,
    name: newClient.name,
    status: newClient.status,
    industry: newClient.industry,
    country: newClient.country,
    clientTier: newClient.clientTier,
    paymentTerms: newClient.paymentTerms,
    taxId: newClient.taxId,
    contact: newClient.primaryContact,
    contacts: newClient.contacts,
    billingAddress: newClient.billingAddress,
    shippingAddress: newClient.shippingAddress,
  });
  return newClient;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const index = mockClients.findIndex((c) => c.id === id || c.clientCode === id);
  if (index === -1) return undefined;
  mockClients[index] = { ...mockClients[index], ...data, updatedAt: nowIso() };
  logAudit({ entity: "CLIENT", action: "client.updated", entityId: mockClients[index].clientCode, description: `Client ${mockClients[index].name} updated` });
  apiWrite(`/clients/${id}`, "PATCH", data);
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
  logAudit({ entity: "PROJECT", action: "project.created", entityId: newProject.projectCode, description: `Project ${newProject.name} created` });
  apiWrite("/projects", "POST", data);
  return newProject;
}

export function updateProject(id: string, data: Partial<Project>): Project | undefined {
  const index = mockProjects.findIndex((p) => p.id === id || p.projectCode === id);
  if (index === -1) return undefined;
  mockProjects[index] = { ...mockProjects[index], ...data, updatedAt: nowIso() };
  logAudit({ entity: "PROJECT", action: "project.updated", entityId: mockProjects[index].projectCode, description: `Project ${mockProjects[index].name} updated` });
  apiWrite(`/projects/${id}`, "PATCH", data);
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
  logAudit({ entity: "ASSIGNMENT", action: "assignment.created", entityId: newAssignment.id, description: `Employee ${newAssignment.employeeId} assigned to ${newAssignment.projectId}` });
  apiWrite("/assignments", "POST", {
    employeeId: newAssignment.employeeId,
    projectId: newAssignment.projectId,
    role: newAssignment.role,
    allocationPercent: newAssignment.allocation,
    billable: newAssignment.billable,
    startDate: newAssignment.startDate,
    endDate: newAssignment.endDate,
  });
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
  logAudit({ entity: "ASSIGNMENT", action: "assignment.ended", entityId: mockAssignments[index].id, description: `Assignment ${mockAssignments[index].id} ended` });
  apiWrite(`/assignments/${id}/end`, "POST", { endDate: mockAssignments[index].endDate });
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
  logAudit({ entity: "DAILY_LOG", action: "daily_log.created", entityId: log.id, description: `Daily log created for ${log.employeeName} on ${log.workDate}` });
  apiWrite("/daily-logs", "POST", data);
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
  logAudit({ entity: "DAILY_LOG", action: "daily_log.updated", entityId: merged.id, description: `Daily log ${merged.id} updated` });
  apiWrite(`/daily-logs/${id}`, "PATCH", data);
  return merged;
}

function nextTimesheetId(): string {
  let max = 0;
  for (const t of mockTimesheets) {
    const n = Number(t.id.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `TS-${max + 1}`;
}

export function submitTimesheet(id: string, submittedBy?: string): Timesheet | undefined {
  const t = mockTimesheets.find((x) => x.id === id);
  if (!t || (t.status !== "DRAFT" && t.status !== "REVISED")) return undefined;
  t.status = "SUBMITTED";
  t.submittedAt = nowIso();
  t.submittedBy = submittedBy ?? t.employeeId;
  t.updatedAt = nowIso();
  logAudit({ entity: "TIMESHEET", action: "timesheet.submitted", entityId: t.id, description: `Timesheet ${t.id} submitted by ${t.submittedBy}` });
  apiWrite(`/timesheets/${id}/submit`, "POST", { submittedBy: t.submittedBy });
  return t;
}

export function approveTimesheet(id: string, reviewedBy: string, notes?: string): Timesheet | undefined {
  const t = mockTimesheets.find((x) => x.id === id);
  if (!t || (t.status !== "SUBMITTED" && t.status !== "IN_REVIEW")) return undefined;
  t.status = "APPROVED";
  t.reviewedBy = reviewedBy;
  t.reviewedAt = nowIso();
  t.reviewNotes = notes;
  t.approvedAt = nowIso();
  t.updatedAt = nowIso();
  logAudit({ entity: "TIMESHEET", action: "timesheet.approved", entityId: t.id, description: `Timesheet ${t.id} approved by ${reviewedBy}` });
  apiWrite(`/timesheets/${id}/approve`, "POST", { reviewedBy, notes });
  return t;
}

export function rejectTimesheet(id: string, reviewedBy: string, notes?: string): Timesheet | undefined {
  const t = mockTimesheets.find((x) => x.id === id);
  if (!t || (t.status !== "SUBMITTED" && t.status !== "IN_REVIEW")) return undefined;
  t.status = "REJECTED";
  t.reviewedBy = reviewedBy;
  t.reviewedAt = nowIso();
  t.reviewNotes = notes;
  t.updatedAt = nowIso();
  logAudit({ entity: "TIMESHEET", action: "timesheet.rejected", entityId: t.id, description: `Timesheet ${t.id} rejected by ${reviewedBy}` });
  apiWrite(`/timesheets/${id}/reject`, "POST", { reviewedBy, notes });
  return t;
}

export function reviseTimesheet(id: string): Timesheet | undefined {
  const t = mockTimesheets.find((x) => x.id === id);
  if (!t || t.status !== "REJECTED") return undefined;
  t.status = "REVISED";
  t.updatedAt = nowIso();
  logAudit({ entity: "TIMESHEET", action: "timesheet.submitted", entityId: t.id, description: `Timesheet ${t.id} sent for revision` });
  apiWrite(`/timesheets/${id}/revise`, "POST", {});
  return t;
}

export function markPaidTimesheet(id: string): Timesheet | undefined {
  const t = mockTimesheets.find((x) => x.id === id);
  if (!t || t.status !== "APPROVED") return undefined;
  t.status = "PAID";
  t.paidAt = nowIso();
  t.updatedAt = nowIso();
  apiWrite(`/timesheets/${id}/mark-paid`, "POST", {});
  return t;
}

export function getTimesheetsByProject(projectId: string): Timesheet[] {
  return mockTimesheets.filter((t) => t.projectBreakdown.some((pb) => pb.projectId === projectId));
}

export interface CompileInput {
  start: string;
  end: string;
  label: string;
  period: number;
}

export function compileTimesheet(employeeId: string, period: CompileInput): Timesheet | undefined {
  const existing = mockTimesheets.find(
    (t) => t.employeeId === employeeId && t.periodStart === period.start && t.periodEnd === period.end
  );
  if (existing) return existing;

  const logs = mockDailyLogs.filter(
    (d) => d.employeeId === employeeId && d.status === "SUBMITTED" && d.workDate >= period.start && d.workDate <= period.end
  );
  if (logs.length === 0) return undefined;

  const emp = mockEmployees.find((e) => e.id === employeeId);
  const breakdownMap = new Map<string, TimesheetProjectBreakdown>();
  let regular = 0;
  let overtime = 0;
  let billableHours = 0;

  for (const log of logs) {
    regular += log.regularHours;
    overtime += log.overtimeHours;
    if (log.billable) {
      billableHours += log.totalHours;
      const rate = emp?.billRate?.amount ?? 0;
      const prev = breakdownMap.get(log.projectId);
      if (prev) {
        prev.billableHours += log.totalHours;
        prev.billableAmount = Number((prev.billableHours * prev.employeeBillRate).toFixed(2));
      } else {
        breakdownMap.set(log.projectId, {
          projectId: log.projectId,
          projectName: log.projectName,
          employeeBillRate: rate,
          billableHours: log.totalHours,
          billableAmount: Number((log.totalHours * rate).toFixed(2)),
        });
      }
    }
  }

  const billableAmount = Number((billableHours * (emp?.billRate?.amount ?? 0)).toFixed(2));
  const now = nowIso();
  const ts: Timesheet = {
    id: nextTimesheetId(),
    employeeId,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : employeeId,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    billingPeriod: period.period,
    year: Number(period.start.slice(0, 4)),
    month: Number(period.start.slice(5, 7)),
    totalDays: logs.length,
    totalBillableHours: billableHours,
    totalRegularHours: regular,
    totalOvertimeHours: overtime,
    totalNonBillableHours: Math.max(0, regular + overtime - billableHours),
    totalHours: regular + overtime,
    billableAmount,
    currency: "USD",
    status: "DRAFT",
    dailyLogIds: [],
    projectBreakdown: Array.from(breakdownMap.values()),
    createdAt: now,
    updatedAt: now,
  };

  for (const log of logs) {
    ts.dailyLogIds.push(log.id);
    const target = mockDailyLogs.find((x) => x.id === log.id);
    if (target) target.timesheetId = ts.id;
  }

  mockTimesheets.push(ts);
  apiWrite("/timesheets/compile", "POST", { employeeId, periodStart: period.start, periodEnd: period.end });
  return ts;
}

export interface CreateTimesheetInput {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  status?: Timesheet["status"];
  notes?: string;
}

export function createTimesheet(data: CreateTimesheetInput): Timesheet {
  const emp = mockEmployees.find((e) => e.id === data.employeeId);
  const now = nowIso();
  const ts: Timesheet = {
    id: nextTimesheetId(),
    employeeId: data.employeeId,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : data.employeeId,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    periodLabel: `${data.periodStart} - ${data.periodEnd}`,
    billingPeriod: Number(data.periodStart.slice(8, 10)) <= 15 ? 1 : 2,
    year: Number(data.periodStart.slice(0, 4)),
    month: Number(data.periodStart.slice(5, 7)),
    totalDays: 0,
    totalBillableHours: 0,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    totalNonBillableHours: 0,
    totalHours: 0,
    billableAmount: 0,
    currency: "USD",
    status: data.status ?? "DRAFT",
    reviewNotes: data.notes,
    dailyLogIds: [],
    projectBreakdown: [],
    createdAt: now,
    updatedAt: now,
  };
  mockTimesheets.push(ts);
  apiWrite("/timesheets", "POST", data);
  return ts;
}

function recomputeInvoiceTotals(inv: Invoice): void {
  const subtotal = Number(inv.lineItems.reduce((s, li) => s + li.amount, 0).toFixed(2));
  const taxAmount = Number((subtotal * inv.taxRate).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  inv.subtotal = subtotal;
  inv.taxAmount = taxAmount;
  inv.totalAmount = totalAmount;
  inv.balanceDue = Number((totalAmount - inv.amountPaid).toFixed(2));
}

function nextInvoiceNumberFor(): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const inv of mockInvoices) {
    const n = Number(inv.invoiceNumber.replace(/\D/g, "").slice(-3));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `INV-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function getApprovedTimesheetsForClient(clientId: string, start: string, end: string): Timesheet[] {
  const projectIds = new Set(mockProjects.filter((p) => p.clientId === clientId).map((p) => p.id));
  return mockTimesheets.filter(
    (t) => t.status === "APPROVED" && t.periodStart === start && t.periodEnd === end && t.projectBreakdown.some((pb) => projectIds.has(pb.projectId))
  );
}

export interface CreateInvoiceInput {
  clientId: string;
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  issueDate: string;
  dueDate: string;
  currency: Invoice["currency"];
  paymentTerms: Invoice["paymentTerms"];
  taxRate: number;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];
  createdBy: string;
}

export function createInvoice(data: CreateInvoiceInput): Invoice {
  const client = mockClients.find((c) => c.id === data.clientId);
  const invoiceNumber = nextInvoiceNumberFor();
  const now = nowIso();
  const inv: Invoice = {
    id: invoiceNumber,
    invoiceNumber,
    clientId: data.clientId,
    clientName: client?.name ?? "",
    clientCode: client?.clientCode ?? "",
    clientAddress: client?.billingAddress,
    poNumber: data.poNumber,
    subject: data.subject,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    periodLabel: data.periodLabel,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    currency: data.currency,
    paymentTerms: data.paymentTerms,
    taxRate: data.taxRate,
    taxAmount: 0,
    subtotal: 0,
    totalAmount: 0,
    amountPaid: 0,
    balanceDue: 0,
    status: "DRAFT",
    lineItems: data.lineItems,
    timesheetIds: data.timesheetIds,
    notes: data.notes,
    termsAndConditions: data.termsAndConditions,
    templateId: data.templateId,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  recomputeInvoiceTotals(inv);
  mockInvoices.push(inv);
  logAudit({ entity: "INVOICE", action: "invoice.created", entityId: inv.invoiceNumber, description: `Invoice ${inv.invoiceNumber} created for ${inv.clientName}` });
  apiWrite("/invoices", "POST", { ...data, autoPopulate: false });
  return inv;
}

export function updateInvoice(id: string, data: Partial<Invoice>): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
  if (!inv) return undefined;
  Object.assign(inv, data, { updatedAt: nowIso() });
  recomputeInvoiceTotals(inv);
  return inv;
}

export function addLineItem(invoiceId: string, item: Omit<InvoiceLineItem, "id" | "sortOrder">): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv) return undefined;
  const sortOrder = inv.lineItems.length;
  inv.lineItems.push({ ...item, id: `LI-${Date.now()}-${sortOrder}`, sortOrder, manual: item.manual ?? true });
  recomputeInvoiceTotals(inv);
  apiWrite(`/invoices/${invoiceId}/line-items`, "POST", item);
  return inv;
}

export function updateLineItem(invoiceId: string, itemId: string, patch: Partial<InvoiceLineItem>): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv) return undefined;
  const li = inv.lineItems.find((x) => x.id === itemId);
  if (!li) return undefined;
  Object.assign(li, patch);
  if (patch.quantity !== undefined || patch.rate !== undefined) li.amount = Number((li.quantity * li.rate).toFixed(2));
  recomputeInvoiceTotals(inv);
  apiWrite(`/invoices/${invoiceId}/line-items/${itemId}`, "PATCH", patch);
  return inv;
}

export function removeLineItem(invoiceId: string, itemId: string): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv) return undefined;
  inv.lineItems = inv.lineItems.filter((x) => x.id !== itemId).map((li, i) => ({ ...li, sortOrder: i }));
  recomputeInvoiceTotals(inv);
  apiWrite(`/invoices/${invoiceId}/line-items/${itemId}`, "DELETE", {});
  return inv;
}

export function reorderLineItems(invoiceId: string, fromIndex: number, toIndex: number): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv || fromIndex === toIndex) return undefined;
  const items = [...inv.lineItems];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  inv.lineItems = items.map((li, i) => ({ ...li, sortOrder: i }));
  apiWrite(`/invoices/${invoiceId}/line-items/reorder`, "POST", { fromIndex, toIndex });
  return inv;
}

export function sendInvoice(id: string, sentBy: string): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
  if (!inv || inv.status !== "DRAFT") return undefined;
  inv.status = "SENT";
  inv.sentAt = nowIso();
  inv.sentBy = sentBy;
  inv.updatedAt = nowIso();
  logAudit({ entity: "INVOICE", action: "invoice.sent", entityId: inv.invoiceNumber, description: `Invoice ${inv.invoiceNumber} sent to ${inv.clientName}` });
  apiWrite(`/invoices/${id}/send`, "POST", {});
  return inv;
}

export function voidInvoice(id: string): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
  if (!inv || !["DRAFT", "SENT", "OVERDUE", "PARTIAL"].includes(inv.status)) return undefined;
  inv.status = "VOID";
  inv.updatedAt = nowIso();
  logAudit({ entity: "INVOICE", action: "invoice.voided", entityId: inv.invoiceNumber, description: `Invoice ${inv.invoiceNumber} voided` });
  apiWrite(`/invoices/${id}/void`, "POST", {});
  return inv;
}

export function markPaidInvoice(id: string): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
  if (!inv || !["SENT", "OVERDUE", "PARTIAL"].includes(inv.status)) return undefined;
  inv.status = "PAID";
  inv.amountPaid = inv.totalAmount;
  inv.balanceDue = 0;
  inv.paidAt = nowIso();
  inv.updatedAt = nowIso();
  apiWrite(`/invoices/${id}/mark-paid`, "POST", {});
  return inv;
}

export interface AuditEntry {
  entity: AuditLog["entity"];
  action: AuditLog["action"];
  entityId: string;
  description: string;
  userName?: string;
  role?: string;
}

export function logAudit(entry: AuditEntry): void {
  mockAuditLogs.unshift({
    id: `AL-${mockAuditLogs.length + 1}-${Date.now()}`,
    timestamp: nowIso(),
    userId: "current",
    userName: entry.userName ?? "Current User",
    role: entry.role ?? "ADMIN",
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    description: entry.description,
  });
}

export function recordPartialPayment(id: string, amount: number): Invoice | undefined {
  const inv = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
  if (!inv || !["SENT", "OVERDUE", "PARTIAL"].includes(inv.status)) return undefined;
  inv.amountPaid = Number((inv.amountPaid + amount).toFixed(2));
  inv.balanceDue = Number((inv.totalAmount - inv.amountPaid).toFixed(2));
  inv.status = inv.balanceDue <= 0 ? "PAID" : "PARTIAL";
  if (inv.status === "PAID") {
    inv.paidAt = nowIso();
    logAudit({ entity: "INVOICE", action: "invoice.paid", entityId: inv.invoiceNumber, description: `Invoice ${inv.invoiceNumber} paid in full` });
  }
  inv.updatedAt = nowIso();
  return inv;
}
