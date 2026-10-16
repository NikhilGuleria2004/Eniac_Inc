import {
  getEmployees,
  getProjects,
  getAssignments,
  getDailyLogs,
  getTimesheets,
  getInvoices,
  getClients,
} from "../../data/mock/repositories";
import { formatCurrency, formatNumber } from "../../lib/charts";
import { getCurrentBillingPeriod, getPreviousBillingPeriods } from "../../lib/utils";

export type ChartType = "bar" | "pie";

export interface ReportColumn {
  key: string;
  header: string;
}

export interface ReportChartPoint {
  name: string;
  value: number;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  chart?: { type: ChartType; data: ReportChartPoint[] };
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  build: () => ReportResult;
}

const COLORS = ["#1A8A5A", "#2563EB", "#B7791F", "#7C3AED", "#C53030", "#0EA5E9", "#10B981", "#6366F1", "#EC4899", "#F59E0B"];

function pieChart(data: ReportChartPoint[]): ReportResult["chart"] {
  return { type: "pie", data: data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] })) };
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "billable-utilization",
    name: "Billable Utilization",
    category: "Workforce",
    description: "Billable vs non-billable employee distribution",
    build: () => {
      const emps = getEmployees();
      const billable = emps.filter((e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE").length;
      const nonBillable = emps.length - billable;
      return {
        columns: [{ key: "segment", header: "Segment" }, { key: "count", header: "Employees" }],
        rows: [
          { segment: "Billable (active)", count: billable },
          { segment: "Non-billable", count: nonBillable },
        ],
        chart: pieChart([{ name: "Billable", value: billable }, { name: "Non-billable", value: nonBillable }]),
      };
    },
  },
  {
    id: "team-capacity",
    name: "Team Capacity",
    category: "Workforce",
    description: "Resource allocation by project",
    build: () => {
      const projects = getProjects();
      const assignments = getAssignments();
      const rows = projects
        .map((p) => {
          const active = assignments.filter((a) => a.projectId === p.id && a.status === "ACTIVE");
          const capacity = active.reduce((s, a) => s + a.allocation, 0);
          return { project: p.name, members: active.length, capacity: `${capacity}%` };
        })
        .sort((a, b) => b.members - a.members)
        .slice(0, 15);
      return {
        columns: [{ key: "project", header: "Project" }, { key: "members", header: "Team Members" }, { key: "capacity", header: "Total Allocation" }],
        rows,
        chart: { type: "bar", data: rows.slice(0, 10).map((r) => ({ name: r.project as string, value: r.members as number })) },
      };
    },
  },
  {
    id: "project-staffing",
    name: "Project Staffing",
    category: "Workforce",
    description: "Headcount per project",
    build: () => {
      const projects = getProjects();
      const assignments = getAssignments();
      const rows = projects.map((p) => ({ project: p.name, headcount: assignments.filter((a) => a.projectId === p.id && a.status === "ACTIVE").length })).filter((r) => r.headcount > 0);
      return {
        columns: [{ key: "project", header: "Project" }, { key: "headcount", header: "Headcount" }],
        rows,
        chart: { type: "bar", data: rows.map((r) => ({ name: r.project as string, value: r.headcount as number })) },
      };
    },
  },
  {
    id: "project-health",
    name: "Project Health",
    category: "Projects",
    description: "Project status and health distribution",
    build: () => {
      const projects = getProjects();
      const healths = ["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"] as const;
      const counts = healths.map((h) => ({ name: h.replace("_", " "), value: projects.filter((p) => p.health === h).length }));
      return {
        columns: [{ key: "health", header: "Health" }, { key: "count", header: "Projects" }],
        rows: healths.map((h) => ({ health: h.replace("_", " "), count: projects.filter((p) => p.health === h).length })),
        chart: pieChart(counts),
      };
    },
  },
  {
    id: "project-progress",
    name: "Project Progress",
    category: "Projects",
    description: "Progress by project",
    build: () => {
      const projects = getProjects().filter((p) => p.status !== "CANCELLED").slice(0, 15);
      return {
        columns: [{ key: "project", header: "Project" }, { key: "progress", header: "Progress" }],
        rows: projects.map((p) => ({ project: p.name, progress: `${p.progress}%` })),
        chart: { type: "bar", data: projects.map((p) => ({ name: p.name, value: p.progress })) },
      };
    },
  },
  {
    id: "project-budget",
    name: "Project Budget",
    category: "Projects",
    description: "Budget vs. logged hours",
    build: () => {
      const projects = getProjects();
      const logs = getDailyLogs();
      const period = getCurrentBillingPeriod();
      const rows = projects
        .filter((p) => p.budget)
        .map((p) => {
          const hours = logs.filter((d) => d.projectId === p.id && d.workDate >= period.start && d.workDate <= period.end).reduce((s, d) => s + d.totalHours, 0);
          return { project: p.name, budget: formatCurrency(p.budget ?? 0), hours: `${hours} h` };
        });
      return {
        columns: [{ key: "project", header: "Project" }, { key: "budget", header: "Budget" }, { key: "hours", header: "Hours (This Period)" }],
        rows,
        chart: { type: "bar", data: projects.filter((p) => p.budget).slice(0, 10).map((p) => ({ name: p.name, value: logs.filter((d) => d.projectId === p.id && d.workDate >= period.start && d.workDate <= period.end).reduce((s, d) => s + d.totalHours, 0) })) },
      };
    },
  },
  {
    id: "timesheet-submission-rate",
    name: "Timesheet Submission Rate",
    category: "Timesheets",
    description: "Timesheet submission and approval rates",
    build: () => {
      const ts = getTimesheets();
      const statuses = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED", "PAID"] as const;
      return {
        columns: [{ key: "status", header: "Status" }, { key: "count", header: "Timesheets" }],
        rows: statuses.map((s) => ({ status: s.replace("_", " "), count: ts.filter((t) => t.status === s).length })),
        chart: { type: "bar", data: statuses.map((s) => ({ name: s.replace("_", " "), value: ts.filter((t) => t.status === s).length })) },
      };
    },
  },
  {
    id: "timesheet-hours",
    name: "Timesheet Hours",
    category: "Timesheets",
    description: "Total hours by period",
    build: () => {
      const periods = getPreviousBillingPeriods(6).reverse();
      const ts = getTimesheets();
      const rows = periods.map((p) => {
        const inPeriod = ts.filter((t) => t.periodStart === p.start);
        return { period: p.label, hours: inPeriod.reduce((s, t) => s + t.totalHours, 0), billable: inPeriod.reduce((s, t) => s + t.totalBillableHours, 0) };
      });
      return {
        columns: [{ key: "period", header: "Period" }, { key: "hours", header: "Total Hours" }, { key: "billable", header: "Billable Hours" }],
        rows: rows.map((r) => ({ period: r.period, hours: `${r.hours} h`, billable: `${r.billable} h` })),
        chart: { type: "bar", data: rows.map((r) => ({ name: r.period, value: r.hours })) },
      };
    },
  },
  {
    id: "overtime-analysis",
    name: "Overtime Analysis",
    category: "Timesheets",
    description: "Overtime hours by period/day",
    build: () => {
      const periods = getPreviousBillingPeriods(6).reverse();
      const logs = getDailyLogs();
      const rows = periods.map((p) => {
        const ot = logs.filter((d) => d.workDate >= p.start && d.workDate <= p.end).reduce((s, d) => s + d.overtimeHours, 0);
        return { period: p.label, overtime: `${ot} h` };
      });
      return {
        columns: [{ key: "period", header: "Period" }, { key: "overtime", header: "Overtime Hours" }],
        rows,
        chart: { type: "bar", data: periods.map((p) => ({ name: p.label, value: logs.filter((d) => d.workDate >= p.start && d.workDate <= p.end).reduce((s, d) => s + d.overtimeHours, 0) })) },
      };
    },
  },
  {
    id: "attendance-patterns",
    name: "Attendance Patterns",
    category: "Attendance",
    description: "Attendance by day/employee",
    build: () => ({
      columns: [{ key: "note", header: "Note" }],
      rows: [{ note: "Attendance data comes from the EMS backend and is not part of the mock seed." }],
    }),
  },
  {
    id: "late-arrivals",
    name: "Late Arrivals",
    category: "Attendance",
    description: "Late arrival frequency",
    build: () => ({
      columns: [{ key: "note", header: "Note" }],
      rows: [{ note: "Attendance data comes from the EMS backend and is not part of the mock seed." }],
    }),
  },
  {
    id: "invoice-status",
    name: "Invoice Status",
    category: "Invoices",
    description: "Invoices by status",
    build: () => {
      const invs = getInvoices();
      const statuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID", "CANCELLED", "PARTIAL"] as const;
      const rows = statuses.map((s) => ({ status: s, count: invs.filter((i) => i.status === s).length })).filter((r) => r.count > 0);
      return {
        columns: [{ key: "status", header: "Status" }, { key: "count", header: "Invoices" }],
        rows,
        chart: { type: "pie", data: rows.map((r) => ({ name: r.status, value: r.count as number })).map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] })) },
      };
    },
  },
  {
    id: "revenue-by-client",
    name: "Revenue by Client",
    category: "Invoices",
    description: "Revenue breakdown by client",
    build: () => {
      const invs = getInvoices().filter((i) => i.status !== "VOID" && i.status !== "CANCELLED" && i.status !== "DRAFT");
      const byClient = new Map<string, number>();
      for (const inv of invs) byClient.set(inv.clientName, (byClient.get(inv.clientName) ?? 0) + inv.totalAmount);
      const rows = Array.from(byClient.entries()).map(([client, total]) => ({ client, revenue: formatCurrency(total) })).sort((a, b) => (b.revenue < a.revenue ? -1 : 1));
      return {
        columns: [{ key: "client", header: "Client" }, { key: "revenue", header: "Revenue" }],
        rows,
        chart: { type: "bar", data: Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })) },
      };
    },
  },
  {
    id: "revenue-by-project",
    name: "Revenue by Project",
    category: "Invoices",
    description: "Revenue breakdown by project",
    build: () => {
      const ts = getTimesheets().filter((t) => t.status === "APPROVED" || t.status === "PAID");
      const byProject = new Map<string, number>();
      for (const t of ts) for (const pb of t.projectBreakdown) byProject.set(pb.projectName, (byProject.get(pb.projectName) ?? 0) + pb.billableAmount);
      const rows = Array.from(byProject.entries()).map(([project, total]) => ({ project, revenue: formatCurrency(total) })).sort((a, b) => (b.revenue < a.revenue ? -1 : 1)).slice(0, 15);
      return {
        columns: [{ key: "project", header: "Project" }, { key: "revenue", header: "Billable Amount" }],
        rows,
        chart: { type: "bar", data: Array.from(byProject.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })) },
      };
    },
  },
  {
    id: "invoice-aging",
    name: "Invoice Aging",
    category: "Invoices",
    description: "Overdue invoice aging",
    build: () => {
      const today = new Date();
      const invs = getInvoices().filter((i) => i.status === "SENT" || i.status === "PARTIAL");
      const buckets = { "0-30 days": 0, "31-60 days": 0, "61-90 days": 0, "90+ days": 0 };
      for (const inv of invs) {
        const days = Math.floor((today.getTime() - new Date(`${inv.dueDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) buckets["0-30 days"] += 1;
        else if (days <= 60) buckets["31-60 days"] += 1;
        else if (days <= 90) buckets["61-90 days"] += 1;
        else buckets["90+ days"] += 1;
      }
      const rows = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      return {
        columns: [{ key: "bucket", header: "Aging Bucket" }, { key: "count", header: "Invoices" }],
        rows,
        chart: { type: "bar", data: rows.map((r) => ({ name: r.bucket as string, value: r.count as number })) },
      };
    },
  },
  {
    id: "payable-amounts",
    name: "Payable Amounts",
    category: "Financial",
    description: "Total billable amounts per employee",
    build: () => {
      const ts = getTimesheets().filter((t) => t.status === "APPROVED" || t.status === "PAID");
      const byEmp = new Map<string, number>();
      for (const t of ts) byEmp.set(t.employeeName, (byEmp.get(t.employeeName) ?? 0) + t.billableAmount);
      const rows = Array.from(byEmp.entries()).map(([employee, amount]) => ({ employee, payable: formatCurrency(amount) })).sort((a, b) => (b.payable < a.payable ? -1 : 1)).slice(0, 15);
      return {
        columns: [{ key: "employee", header: "Employee" }, { key: "payable", header: "Billable Amount" }],
        rows,
        chart: { type: "bar", data: Array.from(byEmp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })) },
      };
    },
  },
  {
    id: "billing-rate-summary",
    name: "Billing Rate Summary",
    category: "Financial",
    description: "Average/lowest/highest bill rates",
    build: () => {
      const rates = getEmployees().filter((e) => e.billRate?.amount).map((e) => e.billRate!.amount);
      const avg = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0;
      const min = rates.length ? Math.min(...rates) : 0;
      const max = rates.length ? Math.max(...rates) : 0;
      return {
        columns: [{ key: "stat", header: "Metric" }, { key: "value", header: "Hourly Rate" }],
        rows: [
          { stat: "Average", value: formatCurrency(avg) },
          { stat: "Lowest", value: formatCurrency(min) },
          { stat: "Highest", value: formatCurrency(max) },
          { stat: "Billable resources", value: formatNumber(rates.length) },
        ],
        chart: { type: "bar", data: [{ name: "Avg", value: avg }, { name: "Low", value: min }, { name: "High", value: max }] },
      };
    },
  },
  {
    id: "client-size-distribution",
    name: "Client Size Distribution",
    category: "Clients",
    description: "Project count or revenue by client tier",
    build: () => {
      const clients = getClients();
      const projects = getProjects();
      const tiers = ["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const;
      const rows = tiers.map((tier) => ({ tier: tier.replace("_", " "), clients: clients.filter((c) => c.clientTier === tier).length, projects: projects.filter((p) => clients.find((c) => c.clientTier === tier && c.id === p.clientId)).length }));
      return {
        columns: [{ key: "tier", header: "Tier" }, { key: "clients", header: "Clients" }, { key: "projects", header: "Projects" }],
        rows,
        chart: pieChart(rows.map((r) => ({ name: r.tier as string, value: r.clients as number }))),
      };
    },
  },
  {
    id: "resource-utilization",
    name: "Resource Utilization",
    category: "Assignments",
    description: "Allocation percentage by employee",
    build: () => {
      const empAlloc = new Map<string, number>();
      for (const a of getAssignments().filter((a) => a.status === "ACTIVE")) {
        const name = (getEmployees().find((e) => e.id === a.employeeId)?.firstName ?? a.employeeId);
        empAlloc.set(name, (empAlloc.get(name) ?? 0) + a.allocation);
      }
      const rows = Array.from(empAlloc.entries()).map(([employee, alloc]) => ({ employee, allocation: `${alloc}%` })).slice(0, 15);
      return {
        columns: [{ key: "employee", header: "Employee" }, { key: "allocation", header: "Total Allocation" }],
        rows,
        chart: { type: "bar", data: Array.from(empAlloc.entries()).slice(0, 10).map(([name, value]) => ({ name, value })) },
      };
    },
  },
  {
    id: "overallocated-employees",
    name: "Overallocated Employees",
    category: "Assignments",
    description: "Employees over 100% allocation",
    build: () => {
      const empAlloc = new Map<string, number>();
      for (const a of getAssignments().filter((a) => a.status === "ACTIVE")) {
        const name = getEmployees().find((e) => e.id === a.employeeId)?.firstName ?? a.employeeId;
        empAlloc.set(name, (empAlloc.get(name) ?? 0) + a.allocation);
      }
      const rows = Array.from(empAlloc.entries()).filter(([, a]) => a > 100).map(([employee, alloc]) => ({ employee, allocation: `${alloc}%` }));
      return {
        columns: [{ key: "employee", header: "Employee" }, { key: "allocation", header: "Total Allocation" }],
        rows,
        chart: { type: "bar", data: rows.map((r) => ({ name: r.employee as string, value: Number(String(r.allocation).replace("%", "")) })) },
      };
    },
  },
];

export const REPORT_CATEGORIES = ["Workforce", "Projects", "Timesheets", "Attendance", "Invoices", "Financial", "Clients", "Assignments"] as const;

export function getReportById(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.id === id);
}
