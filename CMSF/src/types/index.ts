export type Role = "ADMIN" | "HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE";

export type TechRole =
  | "Java Developer"
  | "Frontend Developer"
  | "Backend Developer"
  | "Full Stack Developer"
  | "DevOps Engineer"
  | "QA Engineer"
  | "UI/UX Designer"
  | "Project Manager"
  | "Business Analyst"
  | "Technical Lead"
  | "Scrum Master"
  | "Data Engineer"
  | "Solution Architect";

export type TimesheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REVISED"
  | "PAID";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "CANCELLED" | "PARTIAL";

export type DailyLogStatus = "DRAFT" | "SUBMITTED" | "LOCKED";

export type NotificationType =
  | "TIMESHEET_SUBMITTED"
  | "TIMESHEET_APPROVED"
  | "TIMESHEET_REJECTED"
  | "DAILY_LOG_REMINDER"
  | "INVOICE_SENT"
  | "INVOICE_PAID"
  | "PROJECT_ASSIGNED"
  | "ASSIGNMENT_CREATED"
  | "CLIENT_CREATED"
  | "SYSTEM";

export type AuditAction =
  | "client.created"
  | "client.updated"
  | "project.created"
  | "project.activated"
  | "project.completed"
  | "invoice.created"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.voided"
  | "assignment.created"
  | "assignment.ended"
  | "timesheet.submitted"
  | "timesheet.approved"
  | "timesheet.rejected"
  | "daily_log.created"
  | "daily_log.updated";

export type AuditEntity =
  | "CLIENT"
  | "PROJECT"
  | "ASSIGNMENT"
  | "TIMESHEET"
  | "DAILY_LOG"
  | "INVOICE"
  | "USER";

export type Permission =
  | "client.view"
  | "client.create"
  | "client.edit"
  | "project.view"
  | "project.create"
  | "project.edit"
  | "assignment.view"
  | "assignment.create"
  | "assignment.edit"
  | "daily_log.view"
  | "daily_log.create"
  | "daily_log.edit"
  | "daily_log.view_all"
  | "timesheet.view"
  | "timesheet.view_all"
  | "timesheet.submit"
  | "timesheet.approve"
  | "timesheet.reject"
  | "invoice.view"
  | "invoice.view_all"
  | "invoice.create"
  | "invoice.edit"
  | "invoice.send"
  | "report.view"
  | "audit.view"
  | "settings.manage"
  | "notification.view"
  | "profile.edit"
  | "profile.view_self"
  | "attendance.view";

export interface BaseEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  workMail?: string;
  phone: string;
  avatar?: string;
  designation: string;
  department: string;
  country: string;
  state?: string;
  city: string;
  employmentStatus: "ONBOARDING" | "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "RESIGNED" | "TERMINATED" | "INACTIVE";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  billingStatus: "BILLABLE" | "NON_BILLABLE";
  hourlyRate?: number;
  salary?: number;
  compensation?: { currency?: string; salary?: number; payFrequency?: "MONTHLY" | "YEARLY" | "HOURLY" };
  joiningDate: string;
  managerId?: string;
  supervisorId?: string;
  timesheetEligibility: "NOT_ELIGIBLE" | "ELIGIBLE" | "PENDING_PROVISIONING" | "PROVISIONED" | "PROVISIONING_FAILED";
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Employee extends BaseEmployee {
  techRole?: TechRole;
  billRate?: {
    currency: string;
    amount: number;
    unit: "HOURLY";
  };
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Client {
  id: string;
  clientCode: string;
  name: string;
  country: string;
  industry: string;
  clientTier: "ENTERPRISE" | "MID_MARKET" | "SMB" | "PROSPECT";
  status: "PROSPECT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
  primaryContact: { name: string; email: string; phone: string; role?: string };
  contacts?: Contact[];
  billingAddress: Address;
  shippingAddress?: Address;
  taxId?: string;
  paymentTerms: "NET_15" | "NET_30" | "NET_45" | "NET_60" | "CUSTOM" | "DUE_ON_RECEIPT";
  notes?: string;
  activeProjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  clientId: string;
  clientName: string;
  managerId: string;
  supervisorId?: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED";
  budget?: number;
  budgetCurrency?: string;
  teamSize: number;
  billable: boolean;
  tags?: string[];
  visibility: "INTERNAL" | "CLIENT_VISIBLE";
  tier?: "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: string;
  role: TechRole;
  allocation: number;
  startDate: string;
  endDate?: string;
  billable: boolean;
  status: "ACTIVE" | "PENDING" | "ENDED";
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLog {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  workDate: string;
  dayOfWeek: string;
  taskCategory: "DEVELOPMENT" | "TESTING" | "REVIEW" | "MEETING" | "DESIGN" | "OTHER";
  description: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  billable: boolean;
  billingType: "BILLABLE" | "NON_BILLABLE";
  status: DailyLogStatus;
  timesheetId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface TimesheetProjectBreakdown {
  projectId: string;
  projectName: string;
  employeeBillRate: number;
  billableHours: number;
  billableAmount: number;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  billingPeriod: number;
  year: number;
  month: number;
  totalDays: number;
  totalBillableHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalNonBillableHours: number;
  totalHours: number;
  billableAmount: number;
  currency: string;
  status: TimesheetStatus;
  submittedAt?: string;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedAt?: string;
  paidAt?: string;
  dailyLogIds: string[];
  projectBreakdown: TimesheetProjectBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  currency?: string;
  employeeId?: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  manual: boolean;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  clientAddress?: Address;
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  issueDate: string;
  dueDate: string;
  currency: "USD" | "INR" | "EUR" | "GBP" | "CAD";
  paymentTerms: "NET_15" | "NET_30" | "NET_45" | "NET_60" | "CUSTOM" | "DUE_ON_RECEIPT";
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentBy?: string;
  paidAt?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  footerNote?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  taxSettings?: { defaultRate: number; label: string };
  isDefault: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  description: string;
  ipAddress?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type BillingStatus = "BILLABLE" | "NON_BILLABLE";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  employeeId?: string;
  billingStatus?: BillingStatus;
  timesheetEligibility?: "NOT_ELIGIBLE" | "ELIGIBLE" | "PENDING_PROVISIONING" | "PROVISIONED" | "PROVISIONING_FAILED";
  avatar?: string;
}

export type AccessDeniedReason = "HR_ROLE" | "NON_BILLABLE" | "NOT_ELIGIBLE";

export interface CmsAccess {
  granted: boolean;
  reason?: AccessDeniedReason;
}
