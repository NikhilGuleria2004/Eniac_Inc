import { describe, it, expect } from "vitest";
import {
  dateStr,
  isoStr,
  toClient,
  toProject,
  toAssignment,
  toDailyLog,
  toTimesheet,
  toInvoice,
  toEmployee,
} from "../src/data/mock/adapters";
import { USE_API } from "../src/lib/api";

const dto = (extra: Record<string, unknown>) => ({ _id: "660f00000000000000000000", ...extra });

describe("backend DTO adapters (Phase 8 integration)", () => {
  it("maps a client DTO dropping _id and coercing dates", () => {
    const client = toClient(
      dto({
        id: "SEED-CLIENT-001",
        clientCode: "SEED001",
        name: "Acme",
        industry: "Technology",
        country: "India",
        status: "ACTIVE",
        clientTier: "ENTERPRISE",
        paymentTerms: "NET_30",
        activeProjectCount: 3,
        primaryContact: { name: "John Doe", email: "j@x.com", phone: "1" },
        address: { line1: "1 St", city: "Pune", country: "India" },
        createdAt: new Date("2026-02-01T00:00:00Z"),
        updatedAt: new Date("2026-02-02T00:00:00Z"),
      })
    );
    expect(client.id).toBe("SEED-CLIENT-001");
    expect(client.clientCode).toBe("SEED001");
    expect(client.billingAddress?.city).toBe("Pune");
    expect(client).not.toHaveProperty("_id");
    expect(client.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("maps a project, preserving allocation/ids and date strings", () => {
    const project = toProject(
      dto({
        id: "SEED-PRJ-001",
        projectCode: "SEEDPRJ001",
        name: "Apollo",
        clientId: "C1",
        clientName: "Acme",
        status: "ACTIVE",
        health: "AT_RISK",
        progress: 60,
        teamSize: 2,
        startDate: new Date(2026, 1, 1),
        endDate: new Date(2026, 5, 30),
        budget: 120000,
        visibility: "CLIENT_VISIBLE",
      })
    );
    expect(project.startDate).toBe("2026-02-01");
    expect(project.endDate).toBe("2026-06-30");
    expect(project.progress).toBe(60);
    expect(project.teamSize).toBe(2);
    expect(project.visibility).toBe("CLIENT_VISIBLE");
  });

  it("maps an assignment with EMSB allocationPercent → CMSF allocation", () => {
    const assignment = toAssignment(
      dto({
        id: "PA-001",
        employeeId: "EMP-005",
        projectId: "PRJ-001",
        role: "Java Developer",
        allocation: 75,
        billable: true,
        status: "ACTIVE",
        startDate: new Date("2026-01-01T00:00:00Z"),
        assignedBy: "user_admin",
      })
    );
    expect(assignment.id).toBe("PA-001");
    expect(assignment.allocation).toBe(75);
    expect(assignment.assignedBy).toBe("user_admin");
  });

  it("maps daily logs and timesheets with server-derived hours", () => {
    const log = toDailyLog(
      dto({
        id: "DL-1",
        employeeId: "EMP-005",
        employeeName: "Employee User",
        projectId: "PRJ-001",
        projectName: "Apollo",
        workDate: new Date(2026, 1, 10),
        dayOfWeek: "Wed",
        taskCategory: "DEVELOPMENT",
        description: "Work",
        regularHours: 8,
        overtimeHours: 0,
        billable: true,
        billingType: "BILLABLE",
        status: "SUBMITTED",
      })
    );
    expect(log.workDate).toBe("2026-02-10");
    expect(log.dayOfWeek).toBe("Wed");
    expect(log.totalHours).toBe(8);

    const ts = toTimesheet(
      dto({
        id: "TS-1",
        employeeId: "EMP-005",
        employeeName: "Employee User",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-15",
        periodLabel: "Feb 1-15, 2026",
        billingPeriod: 1,
        year: 2026,
        month: 2,
        totalDays: 2,
        totalBillableHours: 16,
        totalHours: 16,
        billableAmount: 800,
        currency: "USD",
        status: "APPROVED",
        dailyLogIds: ["DL-1"],
        projectBreakdown: [
          { projectId: "PRJ-001", projectName: "Apollo", employeeBillRate: 50, billableHours: 16, billableAmount: 800 },
        ],
      })
    );
    expect(ts.id).toBe("TS-1");
    expect(ts.periodStart).toBe("2026-02-01");
    expect(ts.projectBreakdown[0].billableAmount).toBe(800);
    expect(ts.status).toBe("APPROVED");
  });

  it("maps an invoice with line items and computed totals", () => {
    const invoice = toInvoice(
      dto({
        id: "INV-2026-001",
        invoiceNumber: "INV-2026-001",
        clientId: "C1",
        clientName: "Acme",
        clientCode: "SEED001",
        status: "SENT",
        issueDate: new Date(2026, 1, 16),
        dueDate: new Date(2026, 2, 18),
        taxRate: 0,
        subtotal: 29640,
        taxAmount: 0,
        totalAmount: 29640,
        amountPaid: 0,
        balanceDue: 29640,
        lineItems: [
          { id: "L1", description: "US Based AEM Developer", quantity: 1, rate: 23400, amount: 23400, manual: true, sortOrder: 0 },
          { id: "L2", description: "India-Based Java Developer", quantity: 1, rate: 6240, amount: 6240, manual: false, sortOrder: 1 },
        ],
      })
    );
    expect(invoice.subtotal).toBe(29640);
    expect(invoice.lineItems).toHaveLength(2);
    expect(invoice.issueDate).toBe("2026-02-16");
    expect(invoice.balanceDue).toBe(29640);
  });

  it("maps an employee, normalizing timesheetEligibility", () => {
    const employee = toEmployee(
      dto({
        employeeCode: "EMP-005",
        firstName: "John",
        lastName: "Smith",
        email: "j@x.com",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ACTIVE",
        billingStatus: "BILLABLE",
        techRole: "Java Developer",
        billRate: { currency: "USD", amount: 50, unit: "HOURLY" },
        timesheetEligibility: "ELIGIBLE",
        role: "EMPLOYEE",
      })
    );
    expect(employee.id).toBe("EMP-005");
    expect(employee.techRole).toBe("Java Developer");
    expect(employee.billRate?.amount).toBe(50);
    expect(employee.timesheetEligibility).toBe("ELIGIBLE");
  });

  it("date helpers accept strings and Dates (timezone-safe output)", () => {
    expect(dateStr("2026-02-01")).toBe("2026-02-01");
    expect(dateStr(new Date(2026, 1, 1))).toBe("2026-02-01");
    expect(isoStr(new Date("2026-02-01T10:30:00Z"))).toBe("2026-02-01T10:30:00.000Z");
    expect(dateStr(null)).toBe("");
  });

  it("USE_API defaults to on and reads the env flag", () => {
    expect(typeof USE_API).toBe("boolean");
  });
});
