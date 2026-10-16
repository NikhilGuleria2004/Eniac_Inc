import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import {
  geographyOf,
  techRoleToTier,
  resolveResourceRate,
  STANDARD_RESOURCE_RATES,
} from "../src/lib/rates.js";

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

describe("Period / rate / project math", () => {
  it("maps geography by country", () => {
    expect(geographyOf("United States")).toBe("US Based");
    expect(geographyOf("India")).toBe("India-Based");
    expect(geographyOf("Germany")).toBe("EU Based");
    expect(geographyOf("Denmark")).toBe("EU Based");
  });

  it("collapses granular tech roles into tiers", () => {
    expect(techRoleToTier("Java Developer")).toBe("Developer");
    expect(techRoleToTier("Frontend Developer")).toBe("Developer");
    expect(techRoleToTier("Technical Lead")).toBe("Lead");
    expect(techRoleToTier("Solution Architect")).toBe("Lead");
    expect(techRoleToTier("QA Engineer")).toBe("QA Engineer");
    expect(techRoleToTier("DevOps Engineer")).toBe("DevOps Engineer");
    expect(techRoleToTier("Scrum Master")).toBe("Analyst");
    expect(techRoleToTier("Unknown Role")).toBe("Developer");
  });

  it("resolves rates: exact key first, then tier fallback", () => {
    expect(resolveResourceRate({ country: "United States", techRole: "AEM Developer", designation: "" })).toBe(23400);
    expect(resolveResourceRate({ country: "United States", techRole: "Java Developer", designation: "" })).toBe(23400);
    expect(resolveResourceRate({ country: "Germany", techRole: "Java Developer", designation: "" })).toBe(20584);
    expect(resolveResourceRate({ country: "India", techRole: "DevOps Engineer", designation: "" })).toBe(11000);
  });

  it("the rate table reproduces the INV-000001.pdf values", () => {
    expect(STANDARD_RESOURCE_RATES["US Based AEM Developer"]).toBe(23400);
    expect(STANDARD_RESOURCE_RATES["EU Based Web Developer"]).toBe(20584);
    expect(STANDARD_RESOURCE_RATES["India-Based AEM Developer"]).toBe(6240);
    expect(STANDARD_RESOURCE_RATES["India-Based 24/7 Offshore Dev-ops personnel"]).toBe(13996);
    expect(23400 + 20584 + 6240 + 6240 + 13996).toBe(70460);
  });

  it("resolves rate from designation when techRole is unset", () => {
    expect(resolveResourceRate({ country: "India", techRole: undefined, designation: "Java Developer" })).toBe(6240);
  });
});

describe("CMS hardening — auth, ownership, business rules", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupTestUsers();
    app = createApp();
  });
  afterAll(async () => {
    await closeDatabase();
  });
  beforeEach(async () => {
    const db = getDb();
    await db.collection("daily_logs").deleteMany({});
    await db.collection("timesheets").deleteMany({});
    await db.collection("employees").updateOne(
      { employeeId: "EMP-005" },
      {
        $set: {
          employeeId: "EMP-005",
          firstName: "Employee",
          lastName: "User",
          email: "employee@eniacinc.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: "ACTIVE",
          billingStatus: "BILLABLE",
          billRate: { currency: "USD", amount: 50, unit: "HOURLY" },
          techRole: "Java Developer",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  });

  it("rejects every CMS endpoint without a token (401)", async () => {
    for (const path of ["/daily-logs", "/timesheets", "/invoices", "/invoice-templates", "/analytics/overview"]) {
      await request(app).get(`/api/v1${path}`).expect(401);
    }
  });

  it("blocks HR from all CMS endpoints (403)", async () => {
    const token = await getAccessToken(app, "hreniac@eniacinc.com");
    for (const path of ["/daily-logs", "/timesheets", "/invoices", "/invoice-templates", "/analytics/overview"]) {
      await request(app).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`).expect(403);
    }
    await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "P", workDate: "2026-02-10", taskCategory: "DEVELOPMENT", description: "HR attempt", regularHours: 8, overtimeHours: 0, billingType: "BILLABLE" })
      .expect(403);
  });

  it("locks a daily log once its timesheet is APPROVED", async () => {
    const db = getDb();
    await db.collection("timesheets").insertOne({
      timesheetId: "TS-LOCK-1",
      employeeId: "EMP-005",
      employeeName: "Employee User",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-15",
      currency: "USD",
      status: "APPROVED",
      dailyLogIds: ["DL-LOCK-1"],
      projectBreakdown: [],
      createdBy: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection("daily_logs").insertOne({
      dailyLogId: "DL-LOCK-1",
      employeeId: "EMP-005",
      employeeName: "Employee User",
      projectId: "PRJ-LOCK-1",
      projectName: "Apollo",
      workDate: new Date(2026, 1, 10),
      workDateStr: "2026-02-10",
      dayOfWeek: "Wed",
      taskCategory: "DEVELOPMENT",
      description: "Locked log entry",
      regularHours: 8,
      overtimeHours: 0,
      totalHours: 8,
      billable: true,
      billingType: "BILLABLE",
      status: "SUBMITTED",
      timesheetId: "TS-LOCK-1",
      createdBy: "EMPLOYEE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const manager = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app)
      .patch("/api/v1/daily-logs/DL-LOCK-1")
      .set("Authorization", `Bearer ${manager}`)
      .send({ description: "Trying to edit a locked log entry" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DAILY_LOG_LOCKED");
  });

  it("marks a compiled log LOCKED when the timesheet is approved (auto-lock)", async () => {
    const db = getDb();
    await db.collection("timesheets").insertOne({
      timesheetId: "TS-AUTO", employeeId: "EMP-005", employeeName: "Employee User",
      periodStart: "2026-02-01", periodEnd: "2026-02-15", currency: "USD", status: "SUBMITTED",
      dailyLogIds: ["DL-AUTO"], projectBreakdown: [],
      createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("daily_logs").insertOne({
      dailyLogId: "DL-AUTO", employeeId: "EMP-005", employeeName: "Employee User",
      projectId: "PRJ-AUTO", projectName: "Apollo", workDate: new Date(2026, 1, 10),
      workDateStr: "2026-02-10", dayOfWeek: "Wed", taskCategory: "DEVELOPMENT",
      description: "Auto lock log entry", regularHours: 8, overtimeHours: 0, totalHours: 8,
      billable: true, billingType: "BILLABLE", status: "SUBMITTED", timesheetId: "TS-AUTO",
      createdBy: "EMPLOYEE", createdAt: new Date(), updatedAt: new Date(),
    });

    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).post("/api/v1/timesheets/TS-AUTO/approve").set("Authorization", `Bearer ${supervisor}`).send({ notes: "ok" }).expect(200);

    const logs = await db.collection("daily_logs").find({ dailyLogId: "DL-AUTO" }).toArray();
    expect(logs[0].status).toBe("LOCKED");
  });

  it("scopes SUPERVISOR visibility to supervised projects on timesheets", async () => {
    const db = getDb();
    await db.collection("projects").deleteMany({});
    await db.collection("project_assignments").deleteMany({});
    await db.collection("timesheets").deleteMany({});

    // Supervisor is EMP-004; it supervises PRJ-SUP-1 only.
    await db.collection("projects").insertMany([
      {
        projectId: "PRJ-SUP-1",
        clientId: "CLT-SUP",
        name: "Supervised",
        status: "ACTIVE",
        health: "ON_TRACK",
        progressPercent: 0,
        supervisorId: "EMP-004",
        managerId: "EMP-003",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: "PRJ-OTHER-1",
        clientId: "CLT-OTHER",
        name: "Other",
        status: "ACTIVE",
        health: "ON_TRACK",
        progressPercent: 0,
        supervisorId: "EMP-999",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    await db.collection("project_assignments").insertOne({
      assignmentId: "ASN-SUP-1",
      employeeId: "EMP-005",
      projectId: "PRJ-SUP-1",
      billable: true,
      status: "ACTIVE",
      allocationPercent: 100,
      startDate: new Date(),
      createdBy: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection("timesheets").insertMany([
      {
        timesheetId: "TS-SUP-1",
        employeeId: "EMP-005",
        employeeName: "Employee User",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-15",
        currency: "USD",
        status: "APPROVED",
        dailyLogIds: [],
        projectBreakdown: [{ projectId: "PRJ-SUP-1", projectName: "Supervised", employeeBillRate: 50, billableHours: 10, billableAmount: 500 }],
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        timesheetId: "TS-SUP-2",
        employeeId: "EMP-005",
        employeeName: "Employee User",
        periodStart: "2026-03-16",
        periodEnd: "2026-03-31",
        currency: "USD",
        status: "APPROVED",
        dailyLogIds: [],
        projectBreakdown: [{ projectId: "PRJ-OTHER-1", projectName: "Other", employeeBillRate: 50, billableHours: 10, billableAmount: 500 }],
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    const scoped = await request(app).get("/api/v1/timesheets").set("Authorization", `Bearer ${supervisor}`).expect(200);
    const ids = (scoped.body.data as { id: string }[]).map((t) => t.id);
    expect(ids).toContain("TS-SUP-1");
    expect(ids).not.toContain("TS-SUP-2");
  });

  it("ADMIN sees all timesheets regardless of scope", async () => {
    const admin = await getAccessToken(app, "superadmin@eniacinc.com");
    const res = await request(app).get("/api/v1/timesheets").set("Authorization", `Bearer ${admin}`).expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("emits notifications on timesheet submit and approve", async () => {
    const db = getDb();
    await db.collection("timesheets").deleteMany({});
    await db.collection("daily_logs").deleteMany({});
    await db.collection("notifications").deleteMany({});

    await db.collection("timesheets").insertOne({
      timesheetId: "TS-NOTIF-1",
      employeeId: "EMP-005",
      employeeName: "Employee User",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-15",
      currency: "USD",
      status: "DRAFT",
      dailyLogIds: [],
      projectBreakdown: [{ projectId: "P1", projectName: "Apollo", employeeBillRate: 50, billableHours: 10, billableAmount: 500 }],
      createdBy: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const emp = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).post("/api/v1/timesheets/TS-NOTIF-1/submit").set("Authorization", `Bearer ${emp}`).send({ submittedBy: "EMP-005" }).expect(200);
    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).post("/api/v1/timesheets/TS-NOTIF-1/approve").set("Authorization", `Bearer ${supervisor}`).send({ notes: "ok" }).expect(200);

    const forSubmitter = await db.collection("notifications").find({ type: "TIMESHEET" }).toArray();
    const forEmployee = await db.collection("notifications").find({ userId: "user_employee", type: "TIMESHEET" }).toArray();

    // Reviewers get a "submitted" notification; the employee gets the "approved" one.
    expect(forSubmitter.some((n) => n.title === "Timesheet submitted for review")).toBe(true);
    expect(forEmployee.some((n) => n.title === "Timesheet approved")).toBe(true);
  });
});
