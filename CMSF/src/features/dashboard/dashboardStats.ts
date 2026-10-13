import { getCurrentBillingPeriod } from "../../lib/utils";
import { CHART_COLORS, type DonutPoint } from "../../lib/charts";
import type { Client, Project, Timesheet, Invoice, Employee, ProjectAssignment, DailyLog } from "../../types";

export interface Period {
  start: string;
  end: string;
  label: string;
}

export function currentPeriod(): Period {
  return getCurrentBillingPeriod();
}

export function industryDistribution(clients: Client[]): DonutPoint[] {
  const counts = new Map<string, number>();
  for (const c of clients) counts.set(c.industry, (counts.get(c.industry) ?? 0) + 1);
  return Array.from(counts.entries()).map(([name, value], i) => ({
    name,
    value,
    fill: CHART_COLORS.palette[i % CHART_COLORS.palette.length],
  }));
}

export function projectHealthData(projects: Project[]): DonutPoint[] {
  const order: { key: Project["health"]; label: string; fill: string }[] = [
    { key: "ON_TRACK", label: "On Track", fill: CHART_COLORS.onTrack },
    { key: "AT_RISK", label: "At Risk", fill: CHART_COLORS.atRisk },
    { key: "DELAYED", label: "Delayed", fill: CHART_COLORS.delayed },
    { key: "COMPLETED", label: "Completed", fill: CHART_COLORS.completed },
  ];
  return order.map((o) => ({
    name: o.label,
    value: projects.filter((p) => p.health === o.key).length,
    fill: o.fill,
  }));
}

function billedTimesheetIds(invoices: Invoice[]): Set<string> {
  const ids = new Set<string>();
  for (const inv of invoices) {
    if (inv.status !== "DRAFT" && inv.status !== "VOID" && inv.status !== "CANCELLED") {
      for (const id of inv.timesheetIds ?? []) ids.add(id);
    }
  }
  return ids;
}

export function unbilledHours(timesheets: Timesheet[], invoices: Invoice[]): number {
  const billed = billedTimesheetIds(invoices);
  return timesheets
    .filter((t) => t.status === "APPROVED" && !billed.has(t.id))
    .reduce((sum, t) => sum + t.totalBillableHours, 0);
}

export function outstandingInvoices(invoices: Invoice[]): { count: number; amount: number } {
  const open = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIAL");
  return { count: open.length, amount: open.reduce((s, i) => s + i.balanceDue, 0) };
}

export interface ResourceAllocationRow {
  id: string;
  employee: string;
  employeeId: string;
  projectId: string;
  project: string;
  role: string;
  allocation: number;
  billRate: number;
  hoursThisPeriod: number;
  billable: boolean;
}

export function resourceAllocationRows(
  employees: Employee[],
  assignments: ProjectAssignment[],
  projects: Project[],
  dailyLogs: DailyLog[],
  period: Period,
): ResourceAllocationRow[] {
  const rows: ResourceAllocationRow[] = [];
  for (const a of assignments.filter((x) => x.status === "ACTIVE")) {
    const emp = employees.find((e) => e.id === a.employeeId);
    if (!emp) continue;
    const proj = projects.find((p) => p.id === a.projectId);
    rows.push({
      id: a.id,
      employee: `${emp.firstName} ${emp.lastName}`,
      employeeId: emp.id,
      projectId: a.projectId,
      project: proj?.name ?? "—",
      role: a.role,
      allocation: a.allocation,
      billRate: emp.billRate?.amount ?? emp.hourlyRate ?? 0,
      hoursThisPeriod: hoursInPeriod(dailyLogs, a.employeeId, period),
      billable: a.billable,
    });
  }
  return rows;
}

export function hoursInPeriod(dailyLogs: DailyLog[], employeeId: string, period: Period): number {
  return dailyLogs
    .filter((d) => d.employeeId === employeeId && d.workDate >= period.start && d.workDate <= period.end)
    .reduce((s, d) => s + d.totalHours, 0);
}

export function billableHoursInPeriod(dailyLogs: DailyLog[], employeeId: string, period: Period): number {
  return dailyLogs
    .filter((d) => d.employeeId === employeeId && d.billable && d.workDate >= period.start && d.workDate <= period.end)
    .reduce((s, d) => s + d.totalHours, 0);
}

export function projectHoursInPeriod(dailyLogs: DailyLog[], projectId: string, period: Period): number {
  return dailyLogs
    .filter((d) => d.projectId === projectId && d.workDate >= period.start && d.workDate <= period.end)
    .reduce((s, d) => s + d.totalHours, 0);
}

export function workingDaysInPeriod(period: Period): number {
  let count = 0;
  const d = new Date(`${period.start}T00:00:00`);
  const end = new Date(`${period.end}T00:00:00`);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}
