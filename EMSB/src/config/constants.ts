export const API_BASE = "/api/v1";

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const ROLES = ["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYMENT_STATUSES = [
  "ONBOARDING",
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "RESIGNED",
  "TERMINATED",
  "INACTIVE"
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const BILLING_STATUSES = ["BILLABLE", "NON_BILLABLE"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const COUNTRIES = ["INDIA", "USA"] as const;
export type Country = (typeof COUNTRIES)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const SETTING_CATEGORIES = ["leave_types", "attendance", "documents", "organization", "notifications", "departments", "designations", "employment_types", "countries", "document_types"] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

// Organization identity used on generated billing documents (invoice PDFs).
// Mirrors the sender block of the reference invoice (INV-000001.pdf).
export const ORG_BILLING_INFO = {
  name: "Eniac Inc",
  addressLines: ["California", "U.S.A"],
  email: "hr@eniacinc.com"
} as const;

// ── CMS (Client Management System) enums — see CMSB.md ──────────────────────
export const TECH_ROLES = [
  "Java Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "QA Engineer",
  "UI/UX Designer",
  "Project Manager",
  "Business Analyst",
  "Technical Lead",
  "Scrum Master",
  "Data Engineer",
  "Solution Architect"
] as const;
export type TechRole = (typeof TECH_ROLES)[number];

export const CLIENT_TIERS = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const;
export type ClientTier = (typeof CLIENT_TIERS)[number];

export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const PAYMENT_TERMS = ["NET_15", "NET_30", "NET_45", "NET_60", "CUSTOM", "DUE_ON_RECEIPT"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const TASK_CATEGORIES = ["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TIMESHEET_STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED", "PAID"] as const;
export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIAL"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PROJECT_TIERS = ["SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] as const;
export type ProjectTier = (typeof PROJECT_TIERS)[number];

export const PROJECT_VISIBILITIES = ["INTERNAL", "CLIENT_VISIBLE"] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];
