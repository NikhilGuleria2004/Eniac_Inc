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
  Notification,
  AuditLog,
} from "../../types";
import { TECH_ROLES, INDUSTRIES, PAYMENT_TERMS } from "../constants";
import { getPreviousBillingPeriods } from "../../lib/utils";

function createLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createLcg(20261013);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const chance = (p: number): boolean => rng() < p;
const dec = (min: number, max: number, places = 2): number => Number((rng() * (max - min) + min).toFixed(places));

const FIRST = ["Ananya", "Rahul", "Priya", "Vikram", "Sneha", "Arjun", "Aarav", "Kavya", "Rohan", "Nikhil",
  "John", "Michael", "Sarah", "James", "David", "Emily", "Pierre", "Hans", "Sophie", "Liam"];
const LAST = ["Sharma", "Nair", "Iyer", "Menon", "Reddy", "Gupta", "Smith", "Johnson", "Williams", "Brown",
  "Dubois", "Schneider", "Meyer", "Tanaka", "Muller", "Davis"];
const GEO_COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "France", "India"];
const CLIENT_COMPANIES = [
  "Northwind Trading", "Acme Analytics", "Blue Harbor Logistics", "Cobalt Retail Group", "Meridian Financial",
  "Atlas Software", "Pinnacle Health", "Vantage Media", "Summit Manufacturing", "Lumen Technologies",
  "Ironclad Systems", "Verdan Consulting", "Quantum Labs", "Evergreen Energy", "Helios Telecom",
  "Beacon Insurance", "Crestline Properties", "Onyx E-commerce", "Silverline Bank", "Fathom Robotics",
];
const BILL_RATE_BY_TIER: Record<string, number> = {
  "Java Developer": 62, "Frontend Developer": 58, "Backend Developer": 62, "Full Stack Developer": 72,
  "DevOps Engineer": 84, "QA Engineer": 44, "UI/UX Designer": 54, "Project Manager": 92,
  "Business Analyst": 58, "Technical Lead": 98, "Scrum Master": 78, "Data Engineer": 76, "Solution Architect": 118,
};
const STATUS_CYCLE: Timesheet["status"][] = ["PAID", "APPROVED", "APPROVED", "REJECTED", "SUBMITTED", "IN_REVIEW", "DRAFT"];

function iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekdayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function isWeekend(isoDate: string): boolean {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

export interface SeedData {
  employees: Employee[];
  clients: Client[];
  projects: Project[];
  assignments: ProjectAssignment[];
  dailyLogs: DailyLog[];
  timesheets: Timesheet[];
  invoices: Invoice[];
  invoiceTemplates: InvoiceTemplate[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

export function generateSeed(): SeedData {
  const employees: Employee[] = [];
  const clients: Client[] = [];
  const projects: Project[] = [];
  const assignments: ProjectAssignment[] = [];
  const dailyLogs: DailyLog[] = [];
  const timesheets: Timesheet[] = [];
  const invoices: Invoice[] = [];
  const notifications: Notification[] = [];
  const auditLogs: AuditLog[] = [];

  for (let i = 1; i <= 40; i++) {
    const code = `EMP-${String(i).padStart(3, "0")}`;
    const firstName = FIRST[(i - 1) % FIRST.length];
    const lastName = LAST[(i - 1) % LAST.length];
    const techRole = TECH_ROLES[(i * 3) % TECH_ROLES.length];
    const country = GEO_COUNTRIES[i % GEO_COUNTRIES.length];
    const billable = i <= 26;
    employees.push({
      id: code,
      employeeCode: code,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@eniacinc.com`,
      phone: `+1-555-${String(1000 + i).slice(0, 4)}`,
      designation: techRole,
      department: i % 4 === 0 ? "Design" : "Engineering",
      country,
      city: country === "India" ? "Bangalore" : "Austin",
      employmentStatus: "ACTIVE",
      employmentType: i % 7 === 0 ? "CONTRACT" : "FULL_TIME",
      billingStatus: billable ? "BILLABLE" : "NON_BILLABLE",
      hourlyRate: BILL_RATE_BY_TIER[techRole],
      joiningDate: "2024-01-15",
      techRole,
      billRate: { currency: "USD", amount: BILL_RATE_BY_TIER[techRole], unit: "HOURLY" },
      timesheetEligibility: billable ? "ELIGIBLE" : "NOT_ELIGIBLE",
      role: i === 1 || i === 3 ? "MANAGER" : i === 2 || i === 4 ? "SUPERVISOR" : "EMPLOYEE",
      createdAt: "2024-01-15T09:00:00Z",
      updatedAt: "2026-09-01T09:00:00Z",
    });
  }

  for (let i = 1; i <= 20; i++) {
    const name = CLIENT_COMPANIES[i - 1];
    const industry = INDUSTRIES[(i * 3) % INDUSTRIES.length];
    const country = i % 3 === 0 ? "India" : "United States";
    const statusIndex = i % 5;
    const status: Client["status"] =
      statusIndex === 0 ? "PROSPECT" : statusIndex === 4 ? "INACTIVE" : "ACTIVE";
    const code = `CL-${String(i).padStart(3, "0")}`;
    const tierRandom = i % 4;
    const tier: Client["clientTier"] = tierRandom === 0 ? "ENTERPRISE" : tierRandom === 1 ? "MID_MARKET" : tierRandom === 2 ? "SMB" : "PROSPECT";
    const terms: Client["paymentTerms"] = pick(PAYMENT_TERMS);
    clients.push({
      id: code,
      clientCode: code,
      name,
      country,
      industry,
      clientTier: tier,
      status,
      primaryContact: {
        name: `${pick(FIRST)} ${pick(LAST)}`,
        email: `contact@${name.split(" ")[0].toLowerCase()}.com`,
        phone: `+1-555-${String(int(2000, 9999))}`,
      },
      billingAddress: {
        line1: `${int(100, 9999)} ${pick(["Main", "Market", "Park", "Bridge"])} Street`,
        city: country === "India" ? "Bangalore" : "New York",
        state: country === "India" ? "KA" : "NY",
        postalCode: "10001",
        country,
      },
      paymentTerms: terms,
      notes: "",
      activeProjectCount: 0,
      createdAt: "2025-04-10T09:00:00Z",
      updatedAt: "2026-08-20T09:00:00Z",
    });
  }

  for (let i = 1; i <= 30; i++) {
    const client = clients[(i * 3) % clients.length];
    const code = `PRJ-${String(i).padStart(3, "0")}`;
    const statusIndex = i % 5;
    const status: Project["status"] =
      statusIndex === 0 ? "PLANNING" : statusIndex === 1 ? "ACTIVE" : statusIndex === 3 ? "ON_HOLD" : statusIndex === 4 ? "COMPLETED" : "ACTIVE";
    const health: Project["health"] =
      status === "COMPLETED" ? "COMPLETED" : status === "PLANNING" ? "ON_TRACK" : healthFor(i);
    projects.push({
      id: code,
      projectCode: code,
      name: `${pick(["Apex", "Horizon", "Summit", "Falcon", "Quantum", "Nova"])} ${i}`,
      clientId: client.id,
      clientName: client.name,
      managerId: employees[0].id,
      supervisorId: employees[1].id,
      description: "CMS engagement project",
      startDate: "2026-06-01",
      endDate: "2026-12-31",
      progress: status === "COMPLETED" ? 100 : int(20, 90),
      status,
      health,
      budget: dec(50000, 250000, 0),
      budgetCurrency: "USD",
      teamSize: 0,
      billable: i % 6 !== 0,
      tags: [],
      visibility: i % 5 === 0 ? "INTERNAL" : "CLIENT_VISIBLE",
      createdAt: "2026-06-01T09:00:00Z",
      updatedAt: "2026-09-15T09:00:00Z",
    });
  }

  for (let i = 1; i <= 50; i++) {
    const project = projects[(i * 5) % projects.length];
    const employee = employees[((i * 7) % 40) + 1];
    const statusIndex = i % 9;
    const assignmentStatus: ProjectAssignment["status"] =
      statusIndex === 0 ? "PENDING" : statusIndex === 3 ? "ENDED" : "ACTIVE";
    const start = new Date();
    start.setMonth(start.getMonth() - 2);
    assignments.push({
      id: `PA-${String(i).padStart(3, "0")}`,
      employeeId: employee.id,
      projectId: project.id,
      role: employee.techRole ?? "Java Developer",
      allocation: pick([25, 50, 75, 100]),
      startDate: iso(start),
      billable: chance(0.85),
      status: assignmentStatus,
      assignedBy: employees[0].id,
      createdAt: iso(start),
      updatedAt: iso(new Date()),
    });
  }

  for (const project of projects) {
    project.teamSize = assignments.filter((a) => a.projectId === project.id && a.status === "ACTIVE").length;
  }
  for (const client of clients) {
    client.activeProjectCount = projects.filter((p) => p.clientId === client.id && p.status === "ACTIVE").length;
  }

  const periods = getPreviousBillingPeriods(6);
  const billableEmployees = employees.filter((e) => e.billingStatus === "BILLABLE");

  for (const period of periods) {
    for (const employee of billableEmployees) {
      const employeeAssignments = assignments.filter((a) => a.employeeId === employee.id && a.status === "ACTIVE");
      if (employeeAssignments.length === 0) continue;
      const assignment = employeeAssignments[0];
      const logCount = int(1, 4);
      const dailyLogIds: string[] = [];
      let regular = 0;
      let overtime = 0;
      let billableHours = 0;
      const breakdownMap = new Map<string, TimesheetProjectBreakdown>();

      for (let l = 0; l < logCount; l++) {
        const dayOffset = int(1, 14);
        const date = new Date(`${period.start}T00:00:00`);
        date.setDate(date.getDate() + dayOffset - 1);
        const workDate = iso(date);
        if (workDate > period.end) continue;
        const weekend = isWeekend(workDate);
        const regularH = weekend ? 0 : int(4, 8);
        const overtimeH = weekend ? int(1, 4) : 0;
        const billable = chance(0.9);
        const taskCategory = pick(["DEVELOPMENT", "TESTING", "REVIEW", "MEETING", "DESIGN", "OTHER"] as const);
        const projectId = assignment.projectId;
        dailyLogs.push({
          id: `DL-${dailyLogs.length + 1}`,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          projectId,
          projectName: projects.find((p) => p.id === projectId)?.name ?? "",
          workDate,
          dayOfWeek: weekdayOf(workDate),
          taskCategory,
          description: `${taskCategory} work on ${projects.find((p) => p.id === projectId)?.name ?? "project"}`,
          regularHours: regularH,
          overtimeHours: overtimeH,
          totalHours: regularH + overtimeH,
          billable,
          billingType: billable ? "BILLABLE" : "NON_BILLABLE",
          status: "SUBMITTED",
          createdAt: `${workDate}T18:00:00Z`,
          updatedAt: `${workDate}T18:00:00Z`,
        });
        dailyLogIds.push(dailyLogs[dailyLogs.length - 1].id);
        regular += regularH;
        overtime += overtimeH;

        if (billable) {
          billableHours += regularH + overtimeH;
          const existing = breakdownMap.get(projectId);
          if (existing) {
            existing.billableHours += regularH + overtimeH;
            existing.billableAmount = Number((existing.billableHours * existing.employeeBillRate).toFixed(2));
          } else {
            breakdownMap.set(projectId, {
              projectId,
              projectName: projects.find((p) => p.id === projectId)?.name ?? "",
              employeeBillRate: employee.billRate?.amount ?? 60,
              billableHours: regularH + overtimeH,
              billableAmount: Number(((regularH + overtimeH) * (employee.billRate?.amount ?? 60)).toFixed(2)),
            });
          }
        }
      }

      if (dailyLogIds.length === 0) continue;
      const billableAmount = Number((billableHours * (employee.billRate?.amount ?? 60)).toFixed(2));
      const statusIndex = dampenedStatusIndex(period);
      timesheets.push({
        id: `TS-${timesheets.length + 1}`,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        periodStart: period.start,
        periodEnd: period.end,
        periodLabel: period.label,
        billingPeriod: period.period,
        year: Number(period.start.slice(0, 4)),
        month: Number(period.start.slice(5, 7)),
        totalDays: dailyLogIds.length,
        totalBillableHours: billableHours,
        totalRegularHours: regular,
        totalOvertimeHours: overtime,
        totalNonBillableHours: Math.max(0, (regular + overtime) - billableHours),
        totalHours: regular + overtime,
        billableAmount,
        currency: "USD",
        status: STATUS_CYCLE[statusIndex % STATUS_CYCLE.length],
        submittedAt: `${period.end}T18:00:00Z`,
        dailyLogIds,
        projectBreakdown: Array.from(breakdownMap.values()),
        createdAt: `${period.start}T09:00:00Z`,
        updatedAt: `${period.end}T18:00:00Z`,
      });
    }
  }

  for (let i = 1; i <= 25; i++) {
    const client = clients[(i * 3) % clients.length];
    const ts = timesheets.filter((t) => ["APPROVED", "PAID"].includes(t.status))[(i * 4) % Math.max(1, timesheets.filter((t) => ["APPROVED", "PAID"].includes(t.status)).length)] ?? timesheets[0];
    const lineItems: InvoiceLineItem[] = [];
    const count = int(2, 4);
    for (let li = 0; li < count; li++) {
      const rate = pick([23400, 20584, 6240, 13996]);
      lineItems.push({
        id: `LI-${i}-${li}`,
        description: pick([
          "US Based AEM Developer",
          "EU Based Web Developer",
          "India-Based AEM Developer",
          "India-Based 24/7 Offshore Dev-ops personnel",
        ]),
        quantity: 1,
        rate,
        amount: rate,
        manual: chance(0.3),
        sortOrder: li,
      });
    }
    const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const taxRate = 0;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = subtotal + taxAmount;
    const status = invoiceStatusFor(i);
    invoices.push({
      id: `INV-${String(i).padStart(3, "0")}`,
      invoiceNumber: `INV-2026-${String(i).padStart(3, "0")}`,
      clientId: client.id,
      clientName: client.name,
      clientCode: client.clientCode,
      clientAddress: client.billingAddress,
      poNumber: String(int(100000, 999999)),
      subject: "Professional Consulting",
      periodStart: ts?.periodStart,
      periodEnd: ts?.periodEnd,
      periodLabel: ts?.periodLabel,
      issueDate: ts?.periodEnd ?? "2026-07-01",
      dueDate: ts?.periodEnd ?? "2026-07-15",
      currency: "USD",
      paymentTerms: client.paymentTerms,
      taxRate,
      taxAmount,
      subtotal,
      totalAmount,
      amountPaid: status === "PAID" ? totalAmount : 0,
      balanceDue: status === "PAID" ? 0 : totalAmount,
      status,
      lineItems,
      timesheetIds: ts ? [ts.id] : [],
      notes: "Thanks for your business.",
      createdBy: employees[0].id,
      createdAt: (ts?.periodEnd ?? "2026-07-01") + "T09:00:00Z",
      updatedAt: "2026-09-01T09:00:00Z",
    });
  }

  const invoiceTemplates: InvoiceTemplate[] = [
    {
      id: "TPL-001",
      name: "Standard Professional Services",
      primaryColor: "#1D4ED8",
      isDefault: true,
      footerNote: "Eniac Inc. — Confidential",
      termsAndConditions: "Payment due within the agreed period. Late payments may incur fees.",
      paymentInstructions: "Bank transfer to account ending 0000.",
    },
    { id: "TPL-002", name: "Offshore Delivery", primaryColor: "#16803C", isDefault: false },
    { id: "TPL-003", name: "Enterprise Contract", primaryColor: "#2563EB", isDefault: false },
    { id: "TPL-004", name: "SMB / Starter", primaryColor: "#B7791F", isDefault: false },
    { id: "TPL-005", name: "Blank / Minimal", primaryColor: "#17202A", isDefault: false },
  ];

  for (let i = 1; i <= 12; i++) {
    notifications.push({
      id: `NTF-${i}`,
      userId: "EMP-005",
      type: pick(["TIMESHEET_APPROVED", "TIMESHEET_REJECTED", "INVOICE_SENT", "PROJECT_ASSIGNED"] as const),
      title: pick(["Timesheet approved", "New project assignment", "Invoice received", "Daily log reminder"]),
      message: "Check the CMS for the latest updates on your timesheets and projects.",
      read: chance(0.5),
      createdAt: "2026-09-28T09:00:00Z",
      actionUrl: "/notifications",
    });
  }

  for (let i = 1; i <= 15; i++) {
    const entity = pick(["CLIENT", "PROJECT", "ASSIGNMENT", "TIMESHEET", "INVOICE", "DAILY_LOG"] as const);
    const actionByEntity: Record<string, AuditLog["action"]> = {
      CLIENT: "client.created",
      PROJECT: "project.created",
      ASSIGNMENT: "assignment.created",
      TIMESHEET: "timesheet.approved",
      INVOICE: "invoice.sent",
      DAILY_LOG: "daily_log.created",
    };
    auditLogs.push({
      id: `AL-${i}`,
      timestamp: "2026-09-28T10:00:00Z",
      userId: employees[0].id,
      userName: `${employees[0].firstName} ${employees[0].lastName}`,
      role: "ADMIN",
      action: actionByEntity[entity],
      entity,
      entityId: `${entity}-${i}`,
      description: `${actionByEntity[entity]} on ${entity}`,
      ipAddress: "10.1.1.1",
    });
  }

  return { employees, clients, projects, assignments, dailyLogs, timesheets, invoices, invoiceTemplates, notifications, auditLogs };
}

function healthFor(i: number): Project["health"] {
  const v = i % 5;
  if (v === 1) return "AT_RISK";
  if (v === 2) return "DELAYED";
  return "ON_TRACK";
}

function dampenedStatusIndex(period: { period: 1 | 2; start: string; end: string; label: string }): number {
  const now = new Date();
  const periodEnd = new Date(`${period.end}T00:00:00`);
  const ageDays = (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return 4;
  if (ageDays < 16) return 4;
  if (ageDays < 40) return 5;
  if (ageDays < 70) return 1;
  return 0;
}

function invoiceStatusFor(i: number): Invoice["status"] {
  const v = i % 5;
  if (v === 0) return "OVERDUE";
  if (v === 1) return "PAID";
  if (v === 2) return "SENT";
  if (v === 3) return "DRAFT";
  return "VOID";
}
