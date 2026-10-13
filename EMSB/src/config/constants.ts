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

export const VALID_COUNTRIES = ["INDIA", "USA"];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const VALID_DEMO_ROLES = ["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"] as const;
export type ValidRole = (typeof VALID_DEMO_ROLES)[number];

export const SETTING_CATEGORIES = ["leave_types", "attendance", "documents", "organization", "notifications", "departments", "designations", "employment_types", "countries", "document_types"] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];
