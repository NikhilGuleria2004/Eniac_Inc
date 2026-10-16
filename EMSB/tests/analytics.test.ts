import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

async function seed() {
  const db = getDb();
  await db.collection("invoices").deleteMany({});
  await db.collection("timesheets").deleteMany({});
  await db.collection("clients").deleteMany({});
  await db.collection("employees").deleteMany({});

  await db.collection("clients").insertMany([
    { clientId: "CLT-A", name: "Acme", status: "ACTIVE", createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { clientId: "CLT-B", name: "Beta", status: "INACTIVE", createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() }
  ]);
  await db.collection("employees").insertMany([
    { employeeId: "EMP-005", billingStatus: "BILLABLE", employmentStatus: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
    { employeeId: "EMP-006", billingStatus: "NON_BILLABLE", employmentStatus: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }
  ]);
  await db.collection("invoices").insertMany([
    { invoiceId: "INV-1", invoiceNumber: "INV-1", clientId: "CLT-A", clientName: "Acme", status: "SENT", periodStart: "2026-02-01", periodEnd: "2026-02-15", issueDate: "2026-02-16", dueDate: "2026-03-18", totalAmount: 5000, createdAt: new Date(), updatedAt: new Date() },
    { invoiceId: "INV-2", invoiceNumber: "INV-2", clientId: "CLT-B", clientName: "Beta", status: "PAID", paidAt: new Date("2026-03-01"), periodStart: "2026-02-01", periodEnd: "2026-02-15", issueDate: "2026-02-16", dueDate: "2026-03-18", totalAmount: 3000, createdAt: new Date(), updatedAt: new Date() },
    { invoiceId: "INV-3", invoiceNumber: "INV-3", clientId: "CLT-A", clientName: "Acme", status: "DRAFT", issueDate: "2026-02-16", dueDate: "2026-03-18", totalAmount: 100, createdAt: new Date(), updatedAt: new Date() }
  ]);
  await db.collection("timesheets").insertMany([
    { timesheetId: "TS-1", employeeId: "EMP-005", status: "APPROVED", periodStart: "2026-02-01", periodEnd: "2026-02-15", totalBillableHours: 80, createdAt: new Date(), updatedAt: new Date() },
    { timesheetId: "TS-2", employeeId: "EMP-006", status: "DRAFT", periodStart: "2026-02-01", periodEnd: "2026-02-15", totalBillableHours: 0, createdAt: new Date(), updatedAt: new Date() }
  ]);
}

describe("CMS Phase 8 — Reports & Analytics API", () => {
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

  it("returns timesheet KPIs", async () => {
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app).get("/api/v1/timesheets/kpis").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.approved).toBe(1);
    expect(res.body.data.inProgress).toBe(1);
  });

  it("returns invoice KPIs (draft excluded from totalBilled)", async () => {
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app).get("/api/v1/invoices/kpis").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.draft).toBe(1);
    expect(res.body.data.sent).toBe(1);
    expect(res.body.data.paid).toBe(1);
    expect(res.body.data.totalBilled).toBe(8000);
  });

  it("returns revenue-trend grouped by period with a real label", async () => {
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app).get("/api/v1/invoices/revenue-trend").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.data[0].label).toBe("Feb 1-15, 2026");
    expect(res.body.data[0].revenue).toBe(8000);
  });

  it("returns top clients and submission rate", async () => {
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const top = await request(app).get("/api/v1/invoices/top-clients").set("Authorization", `Bearer ${token}`).expect(200);
    expect(top.body.data[0].name).toBe("Acme");
    expect(top.body.data[0].revenue).toBe(5000);
    const sr = await request(app).get("/api/v1/timesheets/submission-rate").set("Authorization", `Bearer ${token}`).expect(200);
    expect(sr.body.data[0].submitted).toBe(1);
    expect(sr.body.data[0].pending).toBe(1);
  });

  it("returns /analytics/overview with KPIs + series", async () => {
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app).get("/api/v1/analytics/overview").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.data.kpis.billableHours).toBe(80);
    expect(res.body.data.kpis.revenuePerEmployee).toBe(8000); // 1 billable employee
    expect(res.body.data.kpis.clientRetentionRate).toBe(50); // 1 of 2 active
    expect(res.body.data.revenueTrend[0].revenue).toBe(8000);
    expect(res.body.data.topClients[0].name).toBe("Acme");
  });

  it("EMP/SUP are blocked from report.view endpoints", async () => {
    const emp = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).get("/api/v1/invoices/kpis").set("Authorization", `Bearer ${emp}`).expect(403);
    const sup = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).get("/api/v1/analytics/overview").set("Authorization", `Bearer ${sup}`).expect(403);
  });
});
