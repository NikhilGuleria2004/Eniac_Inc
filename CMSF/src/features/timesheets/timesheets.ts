import type { Timesheet, TimesheetStatus } from "../../types";

export const TRANSITIONS: Record<TimesheetStatus, TimesheetStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW", "APPROVED", "REJECTED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
  REJECTED: ["REVISED"],
  REVISED: ["SUBMITTED"],
  PAID: [],
};

export function canTransition(from: TimesheetStatus, to: TimesheetStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canSubmit(status: TimesheetStatus): boolean {
  return status === "DRAFT" || status === "REVISED";
}

export function canApprove(status: TimesheetStatus): boolean {
  return status === "SUBMITTED" || status === "IN_REVIEW";
}

export function canReject(status: TimesheetStatus): boolean {
  return status === "SUBMITTED" || status === "IN_REVIEW";
}

export function canRevise(status: TimesheetStatus): boolean {
  return status === "REJECTED";
}

export function canMarkPaid(status: TimesheetStatus): boolean {
  return status === "APPROVED";
}

export function isOverdue(ts: Timesheet): boolean {
  if (ts.status !== "SUBMITTED" && ts.status !== "IN_REVIEW") return false;
  return ts.periodEnd < new Date().toISOString().slice(0, 10);
}

export interface TimesheetKPIs {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  inProgress: number;
  overdue: number;
}

export function computeTimesheetKPIs(timesheets: Timesheet[]): TimesheetKPIs {
  return {
    total: timesheets.length,
    pending: timesheets.filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW").length,
    approved: timesheets.filter((t) => t.status === "APPROVED").length,
    rejected: timesheets.filter((t) => t.status === "REJECTED").length,
    inProgress: timesheets.filter((t) => t.status === "DRAFT" || t.status === "REVISED").length,
    overdue: timesheets.filter(isOverdue).length,
  };
}

export interface TimesheetFilters {
  search: string;
  employee: string;
  project: string;
  status: string;
  reviewer: string;
  period: string;
}

export function filterTimesheets(
  timesheets: Timesheet[],
  filters: TimesheetFilters,
  isOverdueFn: (t: Timesheet) => boolean = isOverdue
): Timesheet[] {
  const q = filters.search.trim().toLowerCase();
  return timesheets.filter((t) => {
    if (filters.employee !== "all" && t.employeeId !== filters.employee) return false;
    if (filters.project !== "all" && !t.projectBreakdown.some((pb) => pb.projectId === filters.project)) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.reviewer !== "all" && (t.reviewedBy ?? "") !== filters.reviewer) return false;
    if (filters.period !== "all" && t.periodStart !== filters.period) return false;
    if (q && !`${t.employeeName} ${t.periodLabel} ${t.status} ${t.employeeId}`.toLowerCase().includes(q)) return false;
    void isOverdueFn;
    return true;
  });
}
