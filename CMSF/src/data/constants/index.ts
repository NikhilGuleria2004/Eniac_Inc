import type { Role, Permission } from "../../types";

export const ENV_LABEL = "DEMO";

export const ROLES: Role[] = ["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"] as const;

export const CMS_ROLES: Role[] = ["ADMIN", "MANAGER", "SUPERVISOR", "EMPLOYEE"] as const;

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
  "Solution Architect",
] as const;

export const COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "France", "Japan", "Australia"] as const;

export const CLIENT_TIERS = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const;

export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"] as const;

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export const PROJECT_HEALTH = ["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"] as const;

export const ASSIGNMENT_STATUSES = ["ACTIVE", "PENDING", "ENDED"] as const;

export const DAILY_LOG_STATUSES = ["DRAFT", "SUBMITTED", "LOCKED"] as const;

export const BILLING_TYPES = ["BILLABLE", "NON_BILLABLE"] as const;

export const TASK_CATEGORIES = ["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const;

export const PAYMENT_TERMS = ["NET_15", "NET_30", "NET_45", "NET_60", "CUSTOM", "DUE_ON_RECEIPT"] as const;

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIAL"] as const;

export const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD"] as const;

export const PERIOD_TYPES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

export const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Manufacturing",
  "Media & Entertainment",
  "Education",
  "Consulting",
] as const;

export const DEMO_USERS = [
  { email: "admin@eniac.demo", password: "demo123", role: "ADMIN", name: "Admin User" },
  { email: "hr@eniac.demo", password: "demo123", role: "HR", name: "HR User" },
  { email: "manager@eniac.demo", password: "demo123", role: "MANAGER", name: "Manager User" },
  { email: "supervisor@eniac.demo", password: "demo123", role: "SUPERVISOR", name: "Supervisor User" },
  { email: "Employee@eniac.demo", password: "demo123", role: "EMPLOYEE", name: "Employee User" },
] as const;

export const ROUTES = {
  DASHBOARD: "/dashboard",
  CLIENTS: "/clients",
  CLIENT_DETAIL: "/clients/:clientId",
  PROJECTS: "/projects",
  PROJECT_DETAIL: "/projects/:projectId",
  ASSIGNMENTS: "/assignments",
  DAILY_LOGS: "/daily-logs",
  DAILY_LOG_NEW: "/daily-logs/new",
  DAILY_LOG_DETAIL: "/daily-logs/:logId",
  TIMESHEETS: "/timesheets",
  MY_TIMESHEETS: "/timesheets/my",
  TIMESHEET_DETAIL: "/timesheets/:timesheetId",
  INVOICES: "/invoices",
  INVOICE_NEW: "/invoices/new",
  INVOICE_DETAIL: "/invoices/:invoiceId",
  INVOICE_TEMPLATE: "/invoices/templates",
  REPORTS: "/reports",
  ANALYTICS: "/analytics",
  NOTIFICATIONS: "/notifications",
  AUDIT_LOG: "/audit-log",
  SETTINGS: "/settings",
  PROFILE: "/profile",
} as const;

export const STATUS_COLORS = {
  PROSPECT: "badge-neutral",
  ACTIVE: "badge-success",
  INACTIVE: "badge-neutral",
  SUSPENDED: "badge-warning",
  CLOSED: "badge-danger",
} as const;

export const TIMESHEET_STATUS_COLORS: Record<string, string> = {
  DRAFT: "badge-neutral",
  SUBMITTED: "badge-info",
  IN_REVIEW: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  REVISED: "badge-warning",
  PAID: "badge-success",
} as const;

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "badge-neutral",
  SENT: "badge-info",
  PAID: "badge-success",
  OVERDUE: "badge-warning",
  VOID: "badge-danger",
  CANCELLED: "badge-neutral",
  PARTIAL: "badge-warning",
} as const;

export interface SidebarItem {
  label: string;
  route: string;
  icon?: string;
  permission?: Permission;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR_SECTIONS: Record<Role, SidebarSection[]> = {
  ADMIN: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", route: "/dashboard", icon: "Dashboard" }],
    },
    {
      label: "Clients",
      items: [{ label: "Clients", route: "/clients", icon: "Clients" }],
    },
    {
      label: "Projects",
      items: [{ label: "Projects", route: "/projects", icon: "Projects" }],
    },
    {
      label: "Team",
      items: [{ label: "Assignments", route: "/assignments", icon: "Assignments" }],
    },
    {
      label: "Time & Leave",
      items: [
        { label: "Daily Logs", route: "/daily-logs", icon: "Daily Logs" },
        { label: "Timesheets", route: "/timesheets", icon: "Timesheets" },
        { label: "My Timesheets", route: "/timesheets/my", icon: "My Timesheets" },
      ],
    },
    {
      label: "Billing",
      items: [
        { label: "Invoices", route: "/invoices", icon: "Invoices" },
        { label: "Invoice Templates", route: "/invoices/templates", icon: "Settings" },
      ],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", route: "/reports", icon: "Reports" },
        { label: "Analytics", route: "/analytics", icon: "Analytics" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications", icon: "Notifications" },
        { label: "Audit Log", route: "/audit-log", icon: "Audit Log" },
        { label: "Settings", route: "/settings", icon: "Settings" },
      ],
    },
    {
      label: "Profile",
      items: [{ label: "Profile", route: "/profile", icon: "Profile" }],
    },
  ],
  HR: [],
  MANAGER: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", route: "/dashboard", icon: "Dashboard" }],
    },
    {
      label: "Clients",
      items: [{ label: "Clients", route: "/clients", icon: "Clients" }],
    },
    {
      label: "Projects",
      items: [{ label: "Projects", route: "/projects", icon: "Projects" }],
    },
    {
      label: "Team",
      items: [{ label: "Assignments", route: "/assignments", icon: "Assignments" }],
    },
    {
      label: "Time & Leave",
      items: [
        { label: "Daily Logs", route: "/daily-logs", icon: "Daily Logs" },
        { label: "Timesheets", route: "/timesheets", icon: "Timesheets" },
      ],
    },
    {
      label: "Billing",
      items: [{ label: "Invoices", route: "/invoices", icon: "Invoices" }],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", route: "/reports", icon: "Reports" },
        { label: "Analytics", route: "/analytics", icon: "Analytics" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications", icon: "Notifications" },
        { label: "Audit Log", route: "/audit-log", icon: "Audit Log" },
        { label: "Settings", route: "/settings", icon: "Settings" },
      ],
    },
    {
      label: "Profile",
      items: [{ label: "Profile", route: "/profile", icon: "Profile" }],
    },
  ],
  SUPERVISOR: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", route: "/dashboard", icon: "Dashboard" }],
    },
    {
      label: "Projects",
      items: [{ label: "Projects", route: "/projects", icon: "Projects" }],
    },
    {
      label: "Team",
      items: [{ label: "Assignments", route: "/assignments", icon: "Assignments" }],
    },
    {
      label: "Time & Leave",
      items: [
        { label: "Daily Logs", route: "/daily-logs", icon: "Daily Logs" },
        { label: "Timesheets", route: "/timesheets", icon: "Timesheets" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications", icon: "Notifications" },
        { label: "Profile", route: "/profile", icon: "Profile" },
      ],
    },
  ],
  EMPLOYEE: [
    {
      label: "Overview",
      items: [{ label: "Dashboard", route: "/dashboard", icon: "Dashboard" }],
    },
    {
      label: "My Work",
      items: [
        { label: "Daily Logs", route: "/daily-logs", icon: "Daily Logs" },
        { label: "My Timesheets", route: "/timesheets/my", icon: "My Timesheets" },
        { label: "Projects", route: "/projects", icon: "Projects" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications", icon: "Notifications" },
        { label: "Profile", route: "/profile", icon: "Profile" },
      ],
    },
  ],
};

