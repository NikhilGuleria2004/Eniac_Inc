import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

const PERIOD_START = "2026-01-01";
const PERIOD_END = "2026-01-15";

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

async function seed() {
  const db = getDb();
  await db.collection("timesheets").deleteMany({});
  await db.collection("daily_logs").deleteMany({});
  await db.collection("project_assignments").deleteMany({});
  await db.collection("projects").deleteMany({});
  await db.collection("clients").deleteMany({});

  await db.collection("employees").updateOne(
    { employeeId: "EMP-005" },
    { $set: { employeeId: "EMP-005", firstName: "Employee", lastName: "User", email: "employee@eniacinc.com", designation: "Engineer", department: "Engineering", country: "INDIA", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", billRate: { currency: "USD", amount: 50, unit: "HOURLY" }, createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  await db.collection("clients").insertOne({ clientId: "CLT-TS-1", name: "Acme", status: "ACTIVE", createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });
  await db.collection("projects").insertOne({ projectId: "PRJ-TS-1", clientId: "CLT-TS-1", name: "Apollo", status: "ACTIVE", health: "ON_TRACK", progressPercent: 0, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });
  await db.collection("project_assignments").insertOne({ assignmentId: "ASN-TS-1", employeeId: "EMP-005", projectId: "PRJ-TS-1", billable: true, status: "ACTIVE", allocationPercent: 100, startDate: new Date(), createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });

  const mk = (id: string, date: string, dayOfWeek: string, reg: number, ot: number) => ({
    dailyLogId: id, employeeId: "EMP-005", employeeName: "Employee User", projectId: "PRJ-TS-1", projectName: "Apollo",
    workDate: new Date(`${date}T00:00:00`), workDateStr: date, dayOfWeek, taskCategory: "DEVELOPMENT",
    description: "Work on the API", regularHours: reg, overtimeHours: ot, totalHours: reg + ot, billable: true, billingType: "BILLABLE",
    status: "SUBMITTED", createdBy: "EMPLOYEE", createdAt: new Date(), updatedAt: new Date()
  });
  await db.collection("daily_logs").insertMany([mk("DL-TS-1", "2026-01-05", "Mon", 8, 0), mk("DL-TS-2", "2026-01-06", "Tue", 4, 0)]);
}

describe("CMS Phase 6 — Timesheets (billing) API", () => {
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
    await seed();
  });

  const compileBody = { periodStart: PERIOD_START, periodEnd: PERIOD_END };

  async function compileAndSubmit(): Promise<string> {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody).expect(201);
    const ts = { token, id: res.body.data.id };
    await request(app).post(`/api/v1/timesheets/${ts.id}/submit`).set("Authorization", `Bearer ${token}`).send().expect(200);
    return ts.id;
  }

  it("compiles submitted daily logs into a DRAFT timesheet with correct totals", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody).expect(201);
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.totalHours).toBe(12);
    expect(res.body.data.totalBillableHours).toBe(12);
    expect(res.body.data.billableAmount).toBe(600); // 12h × $50
    expect(res.body.data.billingPeriod).toBe(1);
    expect(res.body.data.projectBreakdown[0].employeeBillRate).toBe(50);
  });

  it("compile is idempotent (returns the existing timesheet)", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const a = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody).expect(201);
    const b = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody).expect(201);
    expect(b.body.data.id).toBe(a.body.data.id);
  });

  it("walks DRAFT → SUBMITTED → APPROVED → PAID and locks linked logs", async () => {
    const id = await compileAndSubmit();
    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    const approved = await request(app).post(`/api/v1/timesheets/${id}/approve`).set("Authorization", `Bearer ${supervisor}`).send({ notes: "Looks good" }).expect(200);
    expect(approved.body.data.status).toBe("APPROVED");
    const logs = await getDb().collection("daily_logs").find({}).toArray();
    expect(logs.every((l) => l.status === "LOCKED")).toBe(true);
    const admin = await getAccessToken(app, "superadmin@eniacinc.com");
    const paid = await request(app).post(`/api/v1/timesheets/${id}/mark-paid`).set("Authorization", `Bearer ${admin}`).send().expect(200);
    expect(paid.body.data.status).toBe("PAID");
  });

  it("rejects without notes then recovers via REJECTED → REVISED → SUBMITTED", async () => {
    const id = await compileAndSubmit();
    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    const noNotes = await request(app).post(`/api/v1/timesheets/${id}/reject`).set("Authorization", `Bearer ${supervisor}`).send({});
    expect(noNotes.status).toBe(400);
    const rejected = await request(app).post(`/api/v1/timesheets/${id}/reject`).set("Authorization", `Bearer ${supervisor}`).send({ notes: "Add more detail" }).expect(200);
    expect(rejected.body.data.status).toBe("REJECTED");
    const empToken = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).post(`/api/v1/timesheets/${id}/revise`).set("Authorization", `Bearer ${empToken}`).send().expect(200);
    const resubmitted = await request(app).post(`/api/v1/timesheets/${id}/submit`).set("Authorization", `Bearer ${empToken}`).send().expect(200);
    expect(resubmitted.body.data.status).toBe("SUBMITTED");
  });

  it("blocks illegal transitions (cannot re-submit a SUBMITTED timesheet)", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody).expect(201);
    await request(app).post(`/api/v1/timesheets/${res.body.data.id}/submit`).set("Authorization", `Bearer ${token}`).send().expect(200);
    const again = await request(app).post(`/api/v1/timesheets/${res.body.data.id}/submit`).set("Authorization", `Bearer ${token}`).send();
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe("INVALID_TIMESHEET_TRANSITION");
  });

  it("EMPLOYEE cannot approve/reject; non-admin cannot mark paid", async () => {
    const id = await compileAndSubmit();
    const empToken = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).post(`/api/v1/timesheets/${id}/approve`).set("Authorization", `Bearer ${empToken}`).send({ notes: "x" }).expect(403);
    await request(app).post(`/api/v1/timesheets/${id}/reject`).set("Authorization", `Bearer ${empToken}`).send({ notes: "x" }).expect(403);
    const supervisor = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).post(`/api/v1/timesheets/${id}/mark-paid`).set("Authorization", `Bearer ${supervisor}`).send().expect(403);
  });

  it("EMP compiles → 409 when no submitted logs exist", async () => {
    await getDb().collection("daily_logs").deleteMany({});
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app).post("/api/v1/timesheets/compile").set("Authorization", `Bearer ${token}`).send(compileBody);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("NO_LOGS_TO_COMPILE");
  });
});
