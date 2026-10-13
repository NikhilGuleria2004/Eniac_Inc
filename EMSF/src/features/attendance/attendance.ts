import type { Attendance, Employee, Role } from "../../types";
import { hasPermission } from "../../lib/permissions";

/** §45 calendar legend: status → day-letter. */
export const ATTENDANCE_LEGEND: { code: "P" | "A" | "L" | "LV" | "M"; label: string; statuses: Attendance["status"][] }[] = [
  { code: "P", label: "Present", statuses: ["PRESENT"] },
  { code: "A", label: "Absent", statuses: ["ABSENT"] },
  { code: "L", label: "Late", statuses: ["LATE"] },
  { code: "LV", label: "Leave", statuses: ["LEAVE"] },
  { code: "M", label: "Missing", statuses: ["MISSING"] },
];

export function statusLetter(status: Attendance["status"]): "P" | "A" | "L" | "LV" | "M" {
  return ATTENDANCE_LEGEND.find((l) => l.statuses.includes(status))?.code ?? "M";
}

/** Today's date as YYYY-MM-DD (mock data is anchored to 2026-10-07). */
export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AttendanceTodayKpis {
  presentToday: number;
  absent: number;
  late: number;
  onLeave: number;
  missingPunches: number;
}

/**
 * §44 KPI row, computed over one day's records:
 * - presentToday: status PRESENT
 * - late: status LATE
 * - absent: status ABSENT
 * - onLeave: status LEAVE
 * - missingPunches: status MISSING, or a punched record missing exactly one punch
 */
export function getTodayKpis(records: Attendance[], today: string): AttendanceTodayKpis {
  const day = records.filter((r) => r.date === today);
  const isHalfPunch = (r: Attendance) =>
    (r.checkIn === undefined) !== (r.checkOut === undefined);
  return {
    presentToday: day.filter((r) => r.status === "PRESENT").length,
    absent: day.filter((r) => r.status === "ABSENT").length,
    late: day.filter((r) => r.status === "LATE").length,
    onLeave: day.filter((r) => r.status === "LEAVE").length,
    missingPunches: day.filter((r) => r.status === "MISSING" || isHalfPunch(r)).length,
  };
}

/** §46 exception issue detection. ABSENT/LEAVE days are not exceptions. */
export function getIssue(record: Attendance): string | null {
  if (record.status === "ABSENT" || record.status === "LEAVE") return null;
  if (record.checkIn && !record.checkOut) return "Missing checkout";
  if (!record.checkIn && record.checkOut) return "Missing check-in";
  if (!record.checkIn && !record.checkOut) return "Missing check-in";
  if (record.status === "LATE") return "Late arrival";
  if (record.workingHours !== undefined && record.workingHours < 8) return "Insufficient hours";
  return null;
}

export interface AttendanceException {
  record: Attendance;
  issue: string;
}

/** §46 exception rows: an issue was detected or a correction is pending/resolved. */
export function getExceptions(records: Attendance[]): AttendanceException[] {
  return records
    .map((record) => {
      const issue = getIssue(record) ?? (record.correctionRequested ? "Correction requested" : null);
      return issue ? { record, issue } : null;
    })
    .filter((e): e is AttendanceException => e !== null)
    .sort((a, b) => (a.record.date < b.record.date ? 1 : a.record.date > b.record.date ? -1 : 0));
}

export interface EmployeeAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  missing: number;
  total: number;
}

/** §32 attendance-tab KPIs over a set of records. */
export function getEmployeeSummary(records: Attendance[]): EmployeeAttendanceSummary {
  const count = (status: Attendance["status"]) => records.filter((r) => r.status === status).length;
  return {
    present: count("PRESENT"),
    absent: count("ABSENT"),
    late: count("LATE"),
    leave: count("LEAVE"),
    missing: count("MISSING"),
    total: records.length,
  };
}
export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  letters: ("P" | "A" | "L" | "LV" | "M")[];
  records: Attendance[];
}

/**
 * §45 month grid, Monday-first. Each day cell carries the distinct legend
 * letters for that date (empty when no records).
 */
export function buildMonthGrid(year: number, month: number, records: Attendance[]): CalendarDay[][] {
  const byDate = new Map<string, Attendance[]>();
  for (const r of records) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday-first
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const date = inMonth
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
      : "";
    const dayRecords = inMonth ? byDate.get(date) ?? [] : [];
    week.push({
      date,
      day: inMonth ? dayNum : 0,
      inMonth,
      records: dayRecords,
      letters: ATTENDANCE_LEGEND.map((l) => l.code).filter((code) =>
        dayRecords.some((r) => statusLetter(r.status) === code),
      ),
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export interface EmployeeAttendanceStats {
  employeeId: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  missing: number;
  total: number;
  totalHours: number;
  lastDate?: string;
}

/** Per-employee aggregates for the Employees tab and Reports tab. */
export function getEmployeeAttendanceStats(
  employees: Employee[],
  records: Attendance[],
): EmployeeAttendanceStats[] {
  return employees.map((emp) => {
    const own = records.filter((r) => r.employeeId === emp.id);
    const s = getEmployeeSummary(own);
    const totalHours = own.reduce((sum, r) => sum + (r.workingHours ?? 0), 0);
    const lastDate = own.map((r) => r.date).sort().at(-1);
    return { employeeId: emp.id, ...s, totalHours: Math.round(totalHours * 100) / 100, lastDate };
  });
}

/**
 * §17/§18 scoping: EMPLOYEE sees only their own records; all other roles see
 * every record (SUPERVISOR may mark attendance for assigned staff).
 */
export function scopeAttendanceForRole(
  records: Attendance[],
  role: Role,
  userId: string,
): Attendance[] {
  if (role === "EMPLOYEE") return records.filter((r) => r.employeeId === userId);
  return records;
}

export type CorrectionState = "NONE" | "REQUESTED" | "APPROVED" | "REJECTED";

export function correctionState(record: Attendance): CorrectionState {
  if (record.correctionRequested) return "REQUESTED";
  if (record.correctionResolution) return record.correctionResolution;
  return "NONE";
}

/** Correction UI: attendance.mark holders; EMPLOYEE restricted to own records. */
export function canRequestCorrection(role: Role, userId: string, record: Attendance): boolean {
  if (record.correctionRequested) return false;
  if (!hasPermission(role, "attendance.mark")) return false;
  if (role === "EMPLOYEE") return record.employeeId === userId;
  return true;
}

/** Correction review: attendance.manage (ADMIN/HR). */
export function canReviewCorrections(role: Role): boolean {
  return hasPermission(role, "attendance.manage");
}

export function formatHours(hours: number | undefined): string {
  return hours === undefined ? "—" : `${hours.toFixed(2)} h`;
}

