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
  await db.collection("projects").deleteMany({});
  await db.collection("clients").deleteMany({});

  await db.collection("employees").updateOne(
    { employeeId: "EMP-005" },
    { $set: { employeeId: "EMP-005", firstName: "John", lastName: "Smith", email: "employee@eniacinc.com", designation: "Engineer", country: "United States", techRole: "AEM Developer", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  await db.collection("employees").updateOne(
    { employeeId: "EMP-006" },
    { $set: { employeeId: "EMP-006", firstName: "Asha", lastName: "Rao", email: "asha@eniacinc.com", designation: "Engineer", country: "India", techRole: "Java Developer", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  await db.collection("clients").insertOne({ clientId: "CLT-INV-1", name: "Acme", code: "CLT101", status: "ACTIVE", address: { line1: "1 Market St", city: "New York", state: "NY", country: "United States", postalCode: "10001" }, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });
  await db.collection("projects").insertOne({ projectId: "PRJ-INV-1", clientId: "CLT-INV-1", name: "Apollo", status: "ACTIVE", health: "ON_TRACK", progressPercent: 0, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });
  await db.collection("timesheets").insertMany([
    { timesheetId: "TS-INV-1", employeeId: "EMP-005", employeeName: "John Smith", periodStart: "2026-02-01", periodEnd: "2026-02-15", status: "APPROVED", currency: "USD", dailyLogIds: [], projectBreakdown: [{ projectId: "PRJ-INV-1", projectName: "Apollo", employeeBillRate: 50, billableHours: 80, billableAmount: 4000 }], createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { timesheetId: "TS-INV-2", employeeId: "EMP-006", employeeName: "Asha Rao", periodStart: "2026-02-01", periodEnd: "2026-02-15", status: "APPROVED", currency: "USD", dailyLogIds: [], projectBreakdown: [{ projectId: "PRJ-INV-1", projectName: "Apollo", employeeBillRate: 20, billableHours: 80, billableAmount: 1600 }], createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() }
  ]);
}

describe("CMS Phase 7 — Invoices API", () => {
  let app: Express;
  let managerToken: string;

  beforeAll(async () => {
    await connectDatabase();
    await setupTestUsers();
    app = createApp();
  });
  afterAll(async () => {
    await closeDatabase();
  });
  beforeEach(async () => {
    managerToken = await getAccessToken(app, "manager@eniacinc.com");
    await seed();
  });

  function createInvoiceWithLines(extra: Record<string, unknown> = {}) {
    return request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ clientId: "CLT-INV-1", issueDate: "2026-02-16", dueDate: "2026-03-18", paymentTerms: "NET_30", taxRate: 0, ...extra });
  }

  it("auto-populates line items from approved timesheets (INV-000001 format)", async () => {
    const res = await createInvoiceWithLines({ autoPopulate: true, periodStart: "2026-02-01", periodEnd: "2026-02-15" }).expect(201);
    const data = res.body.data;
    expect(data.status).toBe("DRAFT");
    expect(data.invoiceNumber).toMatch(/^INV-\d{4}-\d{3}$/);
    expect(data.lineItems).toHaveLength(2);
    const us = data.lineItems.find((l: { description: string }) => l.description === "US Based AEM Developer");
    const india = data.lineItems.find((l: { description: string }) => l.description.includes("India-Based"));
    expect(us.amount).toBe(23400);
    expect(india.amount).toBe(6240);
    expect(data.subtotal).toBe(29640);
    expect(data.timesheetIds).toContain("TS-INV-1");
  });

  it("recomputes totals when a manual line item is added", async () => {
    const created = await createInvoiceWithLines({ lineItems: [{ description: "Custom consulting", quantity: 2, rate: 500, manual: true }] }).expect(201);
    const token = await getAccessToken(app, "manager@eniacinc.com");
    const res = await request(app)
      .post(`/api/v1/invoices/${created.body.data.id}/line-items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Extra hours", quantity: 1, rate: 1000 })
      .expect(200);
    expect(res.body.data.subtotal).toBe(2000);
    expect(res.body.data.totalAmount).toBe(2000);
    expect(res.body.data.lineItems).toHaveLength(2);
  });

  it("locks line-item edits once the invoice is SENT", async () => {
    const created = await createInvoiceWithLines({ lineItems: [{ description: "Consulting", quantity: 1, rate: 500, manual: true }] }).expect(201);
    const token = await getAccessToken(app, "manager@eniacinc.com");
    await request(app).post(`/api/v1/invoices/${created.body.data.id}/send`).set("Authorization", `Bearer ${token}`).send({}).expect(200);
    const edit = await request(app)
      .post(`/api/v1/invoices/${created.body.data.id}/line-items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Late edit", quantity: 1, rate: 100 });
    expect(edit.status).toBe(422);
    expect(edit.body.error.code).toBe("INVOICE_NOT_DRAFT");
  });

  it("walks DRAFT → SENT → PAID and records payment amount", async () => {
    const created = await createInvoiceWithLines({ lineItems: [{ description: "Consulting", quantity: 1, rate: 500, manual: true }] }).expect(201);
    const token = await getAccessToken(app, "manager@eniacinc.com");
    await request(app).post(`/api/v1/invoices/${created.body.data.id}/send`).set("Authorization", `Bearer ${token}`).send({}).expect(200);
    const paid = await request(app).post(`/api/v1/invoices/${created.body.data.id}/mark-paid`).set("Authorization", `Bearer ${token}`).send({}).expect(200);
    expect(paid.body.data.status).toBe("PAID");
    expect(paid.body.data.amountPaid).toBe(500);
    expect(paid.body.data.balanceDue).toBe(0);
  });

  it("supports partial payment then settles to PAID", async () => {
    const created = await createInvoiceWithLines({ lineItems: [{ description: "Consulting", quantity: 1, rate: 500, manual: true }] }).expect(201);
    const token = await getAccessToken(app, "manager@eniacinc.com");
    await request(app).post(`/api/v1/invoices/${created.body.data.id}/send`).set("Authorization", `Bearer ${token}`).send({}).expect(200);
    const partial = await request(app).post(`/api/v1/invoices/${created.body.data.id}/payments`).set("Authorization", `Bearer ${token}`).send({ amount: 200 }).expect(200);
    expect(partial.body.data.status).toBe("PARTIAL");
    expect(partial.body.data.balanceDue).toBe(300);
    const paid = await request(app).post(`/api/v1/invoices/${created.body.data.id}/payments`).set("Authorization", `Bearer ${token}`).send({ amount: 300 }).expect(200);
    expect(paid.body.data.status).toBe("PAID");
  });

  it("EMP/SUP are blocked from invoices; MANAGER can void", async () => {
    const empToken = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).get("/api/v1/invoices").set("Authorization", `Bearer ${empToken}`).expect(403);
    const supToken = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).get("/api/v1/invoices").set("Authorization", `Bearer ${supToken}`).expect(403);
    const created = await createInvoiceWithLines({ lineItems: [{ description: "Consulting", quantity: 1, rate: 500, manual: true }] }).expect(201);
    const mgr = await getAccessToken(app, "manager@eniacinc.com");
    const voided = await request(app).post(`/api/v1/invoices/${created.body.data.id}/void`).set("Authorization", `Bearer ${mgr}`).send({}).expect(200);
    expect(voided.body.data.status).toBe("VOID");
  });
});
