// Maps EMSB API DTOs → CMSF types. The backend DTOs are already camelCase and
// id-aliased (matching CMSB.md §47), so these adapters only need to:
//   1. strip Mongo `_id`
//   2. coerce Date fields to CMSF's string shapes ("YYYY-MM-DD" / ISO 8601)
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
} from "../../types";

type Loose = Record<string, unknown>;

export function dateStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function toClient(dto: Loose): Client {
  return {
    id: String(dto.id),
    clientCode: String(dto.clientCode ?? dto.id),
    name: String(dto.name),
    country: String(dto.country ?? ""),
    industry: String(dto.industry ?? ""),
    clientTier: (dto.clientTier as Client["clientTier"]) ?? "SMB",
    status: (dto.status as Client["status"]) ?? "ACTIVE",
    primaryContact: dto.primaryContact as Client["primaryContact"],
    contacts: dto.contacts as Client["contacts"],
    billingAddress: (dto.billingAddress ?? dto.address) as Client["billingAddress"],
    shippingAddress: dto.shippingAddress as Client["shippingAddress"],
    taxId: dto.taxId as string | undefined,
    paymentTerms: (dto.paymentTerms as Client["paymentTerms"]) ?? "NET_30",
    notes: dto.notes as string | undefined,
    activeProjectCount: Number(dto.activeProjectCount ?? 0),
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
  };
}

export function toProject(dto: Loose): Project {
  return {
    id: String(dto.id),
    projectCode: String(dto.projectCode ?? dto.id),
    name: String(dto.name),
    clientId: String(dto.clientId),
    clientName: String(dto.clientName ?? ""),
    managerId: String(dto.managerId ?? ""),
    supervisorId: dto.supervisorId as string | undefined,
    description: String(dto.description ?? ""),
    startDate: dateStr(dto.startDate),
    endDate: dateStr(dto.endDate),
    progress: Number(dto.progress ?? 0),
    status: (dto.status as Project["status"]) ?? "PLANNING",
    health: (dto.health as Project["health"]) ?? "ON_TRACK",
    budget: dto.budget as number | undefined,
    budgetCurrency: dto.budgetCurrency as string | undefined,
    teamSize: Number(dto.teamSize ?? 0),
    billable: Boolean(dto.billable ?? true),
    tags: dto.tags as string[] | undefined,
    visibility: (dto.visibility as Project["visibility"]) ?? "INTERNAL",
    tier: dto.tier as Project["tier"],
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
  };
}

export function toAssignment(dto: Loose): ProjectAssignment {
  return {
    id: String(dto.id),
    employeeId: String(dto.employeeId),
    projectId: String(dto.projectId),
    role: (dto.role as ProjectAssignment["role"]) ?? "Java Developer",
    allocation: Number(dto.allocation ?? 0),
    startDate: dateStr(dto.startDate),
    endDate: dto.endDate ? dateStr(dto.endDate) : undefined,
    billable: Boolean(dto.billable),
    status: (dto.status as ProjectAssignment["status"]) ?? "ACTIVE",
    assignedBy: String(dto.assignedBy ?? ""),
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
  };
}

export function toDailyLog(dto: Loose): DailyLog {
  const regularHours = Number(dto.regularHours ?? 0);
  const overtimeHours = Number(dto.overtimeHours ?? 0);
  return {
    id: String(dto.id),
    employeeId: String(dto.employeeId),
    employeeName: String(dto.employeeName ?? ""),
    projectId: String(dto.projectId),
    projectName: String(dto.projectName ?? ""),
    workDate: dateStr(dto.workDate),
    dayOfWeek: String(dto.dayOfWeek ?? ""),
    taskCategory: (dto.taskCategory as DailyLog["taskCategory"]) ?? "DEVELOPMENT",
    description: String(dto.description ?? ""),
    regularHours,
    overtimeHours,
    totalHours: Number(dto.totalHours ?? regularHours + overtimeHours),
    billable: Boolean(dto.billable),
    billingType: (dto.billingType as DailyLog["billingType"]) ?? "BILLABLE",
    status: (dto.status as DailyLog["status"]) ?? "SUBMITTED",
    timesheetId: dto.timesheetId as string | undefined,
    reviewedBy: dto.reviewedBy as string | undefined,
    reviewedAt: dto.reviewedAt ? isoStr(dto.reviewedAt) : undefined,
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
    tags: dto.tags as string[] | undefined,
  };
}

function toBreakdown(dto: Loose): TimesheetProjectBreakdown {
  return {
    projectId: String(dto.projectId),
    projectName: String(dto.projectName ?? ""),
    employeeBillRate: Number(dto.employeeBillRate ?? 0),
    billableHours: Number(dto.billableHours ?? 0),
    billableAmount: Number(dto.billableAmount ?? 0),
  };
}

export function toTimesheet(dto: Loose): Timesheet {
  return {
    id: String(dto.id),
    employeeId: String(dto.employeeId),
    employeeName: String(dto.employeeName ?? ""),
    periodStart: dateStr(dto.periodStart),
    periodEnd: dateStr(dto.periodEnd),
    periodLabel: String(dto.periodLabel ?? ""),
    billingPeriod: Number(dto.billingPeriod ?? 1),
    year: Number(dto.year ?? 0),
    month: Number(dto.month ?? 0),
    totalDays: Number(dto.totalDays ?? 0),
    totalBillableHours: Number(dto.totalBillableHours ?? 0),
    totalRegularHours: Number(dto.totalRegularHours ?? 0),
    totalOvertimeHours: Number(dto.totalOvertimeHours ?? 0),
    totalNonBillableHours: Number(dto.totalNonBillableHours ?? 0),
    totalHours: Number(dto.totalHours ?? 0),
    billableAmount: Number(dto.billableAmount ?? 0),
    currency: String(dto.currency ?? "USD"),
    status: (dto.status as Timesheet["status"]) ?? "DRAFT",
    submittedAt: dto.submittedAt ? isoStr(dto.submittedAt) : undefined,
    submittedBy: dto.submittedBy as string | undefined,
    reviewedBy: dto.reviewedBy as string | undefined,
    reviewedAt: dto.reviewedAt ? isoStr(dto.reviewedAt) : undefined,
    reviewNotes: dto.reviewNotes as string | undefined,
    approvedAt: dto.approvedAt ? isoStr(dto.approvedAt) : undefined,
    paidAt: dto.paidAt ? isoStr(dto.paidAt) : undefined,
    dailyLogIds: (dto.dailyLogIds as string[]) ?? [],
    projectBreakdown: ((dto.projectBreakdown as Loose[]) ?? []).map(toBreakdown),
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
  };
}

function toLineItem(dto: Loose): InvoiceLineItem {
  return {
    id: String(dto.id),
    description: String(dto.description ?? ""),
    quantity: Number(dto.quantity ?? 0),
    rate: Number(dto.rate ?? 0),
    amount: Number(dto.amount ?? 0),
    currency: dto.currency as string | undefined,
    employeeId: dto.employeeId as string | undefined,
    employeeName: dto.employeeName as string | undefined,
    projectId: dto.projectId as string | undefined,
    projectName: dto.projectName as string | undefined,
    manual: Boolean(dto.manual),
    sortOrder: Number(dto.sortOrder ?? 0),
  };
}

export function toInvoice(dto: Loose): Invoice {
  return {
    id: String(dto.id),
    invoiceNumber: String(dto.invoiceNumber ?? dto.id),
    clientId: String(dto.clientId),
    clientName: String(dto.clientName ?? ""),
    clientCode: String(dto.clientCode ?? ""),
    clientAddress: dto.clientAddress as Invoice["clientAddress"],
    poNumber: dto.poNumber as string | undefined,
    subject: String(dto.subject ?? ""),
    periodStart: dto.periodStart ? dateStr(dto.periodStart) : undefined,
    periodEnd: dto.periodEnd ? dateStr(dto.periodEnd) : undefined,
    periodLabel: dto.periodLabel as string | undefined,
    issueDate: dateStr(dto.issueDate),
    dueDate: dateStr(dto.dueDate),
    currency: (dto.currency as Invoice["currency"]) ?? "USD",
    paymentTerms: (dto.paymentTerms as Invoice["paymentTerms"]) ?? "NET_30",
    taxRate: Number(dto.taxRate ?? 0),
    taxAmount: Number(dto.taxAmount ?? 0),
    subtotal: Number(dto.subtotal ?? 0),
    totalAmount: Number(dto.totalAmount ?? 0),
    amountPaid: Number(dto.amountPaid ?? 0),
    balanceDue: Number(dto.balanceDue ?? 0),
    status: (dto.status as Invoice["status"]) ?? "DRAFT",
    lineItems: ((dto.lineItems as Loose[]) ?? []).map(toLineItem),
    timesheetIds: dto.timesheetIds as string[] | undefined,
    notes: dto.notes as string | undefined,
    termsAndConditions: dto.termsAndConditions as string | undefined,
    templateId: dto.templateId as string | undefined,
    createdBy: String(dto.createdBy ?? ""),
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
    sentAt: dto.sentAt ? isoStr(dto.sentAt) : undefined,
    sentBy: dto.sentBy as string | undefined,
    paidAt: dto.paidAt ? isoStr(dto.paidAt) : undefined,
  };
}

export function toInvoiceTemplate(dto: Loose): InvoiceTemplate {
  return {
    id: String(dto.id),
    name: String(dto.name),
    logoUrl: dto.logoUrl as string | undefined,
    primaryColor: String(dto.primaryColor ?? "#0F2B1D"),
    secondaryColor: dto.secondaryColor as string | undefined,
    footerNote: dto.footerNote as string | undefined,
    termsAndConditions: dto.termsAndConditions as string | undefined,
    paymentInstructions: dto.paymentInstructions as string | undefined,
    taxSettings: dto.taxSettings as InvoiceTemplate["taxSettings"],
    isDefault: Boolean(dto.isDefault),
  };
}

export function toEmployee(dto: Loose): Employee {
  return {
    id: String(dto.employeeCode ?? dto.id),
    employeeCode: String(dto.employeeCode ?? dto.id),
    firstName: String(dto.firstName),
    lastName: String(dto.lastName),
    email: String(dto.email),
    workMail: dto.workMail as string | undefined,
    phone: String(dto.phone ?? ""),
    avatar: dto.avatar as string | undefined,
    designation: String(dto.designation),
    department: String(dto.department),
    country: String(dto.country),
    state: dto.state as string | undefined,
    city: String(dto.city ?? ""),
    employmentStatus: (dto.employmentStatus as Employee["employmentStatus"]) ?? "ACTIVE",
    employmentType: (dto.employmentType as Employee["employmentType"]) ?? "FULL_TIME",
    billingStatus: (dto.billingStatus as Employee["billingStatus"]) ?? "NON_BILLABLE",
    hourlyRate: dto.hourlyRate as number | undefined,
    salary: dto.salary as number | undefined,
    compensation: dto.compensation as Employee["compensation"],
    joiningDate: dateStr(dto.joiningDate),
    managerId: dto.managerId as string | undefined,
    supervisorId: dto.managerId as string | undefined,
    techRole: dto.techRole as Employee["techRole"],
    billRate: dto.billRate as Employee["billRate"],
    timesheetEligibility: (dto.timesheetEligibility === "ELIGIBLE" ? "ELIGIBLE" : "NOT_ELIGIBLE") as Employee["timesheetEligibility"],
    role: (dto.role as Employee["role"]) ?? "EMPLOYEE",
    createdAt: isoStr(dto.createdAt),
    updatedAt: isoStr(dto.updatedAt),
  };
}
