import type { Employee, LeaveRequest, Permission, Role } from "../../types";
import { hasPermission } from "../../lib/permissions";

export type LeaveType = LeaveRequest["type"];
export type LeaveStatus = LeaveRequest["status"];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  PAID: "Paid Leave",
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  UNPAID: "Unpaid Leave",
};

/** Mock configuration for §48: which leave types require a supporting document. */
export const DOCUMENT_REQUIRED_LEAVE_TYPES: readonly LeaveType[] = ["SICK"];

export function requiresSupportingDocument(type: LeaveType): boolean {
  return DOCUMENT_REQUIRED_LEAVE_TYPES.includes(type);
}

/** Annual quotas per leave type (mirrors the employee dashboard balances). */
export const LEAVE_QUOTAS: Record<LeaveType, number> = {
  PAID: 18,
  SICK: 10,
  CASUAL: 12,
  UNPAID: 0,
};

/** Mock-anchored "today" (same anchor as attendance: ISO date of real now). */
export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inclusive calendar-day count between two ISO dates. 0 when invalid/reversed. */
export function requestDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** True when two ISO date ranges share at least one day. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isOnLeaveToday(request: LeaveRequest, today = getToday()): boolean {
  return (
    request.status === "APPROVED" &&
    request.startDate <= today &&
    today <= request.endDate
  );
}

export interface LeaveKpis {
  pending: number;
  approved: number;
  rejected: number;
  onLeaveToday: number;
}

/** §47 dashboard KPIs. On Leave Today counts distinct employees on approved leave. */
export function getLeaveKpis(requests: LeaveRequest[], today = getToday()): LeaveKpis {
  const onLeaveEmployees = new Set(
    requests
      .filter((r) => r.status === "APPROVED" && r.startDate <= today && today <= r.endDate)
      .map((r) => r.employeeId),
  );
  return {
    pending: requests.filter((r) => r.status === "PENDING").length,
    approved: requests.filter((r) => r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
    onLeaveToday: onLeaveEmployees.size,
  };
}

export interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export type LeaveBalances = Record<LeaveType, LeaveBalance>;

/**
 * Per-employee balance: quota per type minus days from APPROVED requests.
 * UNPAID has no quota (consumed only when taken unpaid).
 */
export function getLeaveBalances(
  employeeId: string,
  requests: LeaveRequest[],
): LeaveBalances {
  const own = requests.filter((r) => r.employeeId === employeeId && r.status === "APPROVED");
  const balances = {} as LeaveBalances;
  for (const type of Object.keys(LEAVE_QUOTAS) as LeaveType[]) {
    const used = own.filter((r) => r.type === type).reduce((s, r) => s + r.days, 0);
    const total = LEAVE_QUOTAS[type];
    balances[type] = { total, used, remaining: Math.max(total - used, 0) };
  }
  return balances;
}

export interface LeaveRequestFormInput {
  employeeId: string;
  type: LeaveType | "";
  startDate: string;
  endDate: string;
  reason: string;
  documentName?: string;
}

/**
 * §48 validation: required fields, start ≤ end, no overlap with APPROVED
 * leave, supporting document for configured types, and balance sufficiency
 * (UNPAID has no quota to consume).
 */
export function validateLeaveRequest(
  input: LeaveRequestFormInput,
  existing: LeaveRequest[],
): string[] {
  const errors: string[] = [];
  if (!input.type) errors.push("Leave type is required.");
  if (!input.startDate) errors.push("Start date is required.");
  if (!input.endDate) errors.push("End date is required.");
  if (input.reason.trim() === "") errors.push("Reason is required.");
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    errors.push("Start date cannot be after end date.");
  }
  if (input.startDate && input.endDate && input.startDate <= input.endDate) {
    const days = requestDays(input.startDate, input.endDate);
    const conflict = existing.find(
      (r) =>
        r.employeeId === input.employeeId &&
        r.status === "APPROVED" &&
        rangesOverlap(input.startDate, input.endDate, r.startDate, r.endDate),
    );
    if (conflict) {
      errors.push(
        `Dates overlap approved leave (${conflict.startDate} → ${conflict.endDate}).`,
      );
    }
    if (input.type && requiresSupportingDocument(input.type as LeaveType) && !input.documentName) {
      errors.push(
        `Supporting document is required for ${LEAVE_TYPE_LABELS[input.type as LeaveType]}.`,
      );
    }
    if (input.type && input.type !== "UNPAID") {
      const balance = getLeaveBalances(input.employeeId, existing)[input.type as LeaveType];
      if (days > balance.remaining) {
        errors.push(
          `Insufficient balance: requested ${days} ${LEAVE_TYPE_LABELS[input.type as LeaveType]} days, ${balance.remaining} remaining.`,
        );
      }
    }
  }
  return errors;
}

/** §48 summary shown live in the form. */
export function getRequestSummary(
  input: LeaveRequestFormInput,
  existing: LeaveRequest[],
): { requested: number; available: number; remaining: number } {
  const requested =
    input.startDate && input.endDate && input.startDate <= input.endDate
      ? requestDays(input.startDate, input.endDate)
      : 0;
  if (!input.type || input.type === "UNPAID") {
    return { requested, available: 0, remaining: 0 };
  }
  const balance = getLeaveBalances(input.employeeId, existing)[input.type as LeaveType];
  return {
    requested,
    available: balance.remaining,
    remaining: Math.max(balance.remaining - requested, 0),
  };
}

/** §17/§18 scoping: EMPLOYEE sees only their own requests, everyone else all. */
export function scopeLeaveForRole(
  requests: LeaveRequest[],
  role: Role,
  employeeId: string,
): LeaveRequest[] {
  if (role === "EMPLOYEE") return requests.filter((r) => r.employeeId === employeeId);
  return requests;
}

export function canApproveLeave(role: Role): boolean {
  return hasPermission(role, "leave.approve");
}

export function canRequestLeave(): boolean {
  return hasPermission("EMPLOYEE", "leave.view");
}

export function canViewLeaveRequest(
  role: Role,
  viewerId: string,
  request: LeaveRequest,
): boolean {
  if (role === "EMPLOYEE") return request.employeeId === viewerId;
  return hasPermission(role, "leave.view");
}

/** Permission object for route guards (kept as a value for PermissionGuard). */
export const LEAVE_VIEW_PERMISSION: Permission = "leave.view";

export function employeeName(employees: Employee[], employeeId: string): string {
  const emp = employees.find((e) => e.id === employeeId);
  return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
}

export function formatLeaveRange(request: LeaveRequest): string {
  return request.startDate === request.endDate
    ? request.startDate
    : `${request.startDate} → ${request.endDate}`;
}
