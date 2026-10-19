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

async function seedBase() {
  const db = getDb();
  await db.collection("invoices").deleteMany({});
  await db.collection("invoice_templates").deleteMany({});
  await db.collection("timesheets").deleteMany({});
  await db.collection("projects").deleteMany({});
  await db.collection("clients").deleteMany({});
  await db.collection("employees").updateOne(
    { employeeId: "EMP-005" },
    { $set: { employeeId: "EMP-005", firstName: "John", lastName: "Smith", email: "employee@eniacinc.com", designation: "Engineer", country: "United States", techRole: "AEM Developer", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  await db.collection("clients").insertOne({ clientId: "CLT-EX-1", name: "Acme", code: "CLTEX1", status: "ACTIVE", billingAddress: { line1: "1 Market St", city: "NY", country: "United States" }, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() } as never);
}

describe("CMS Invoice extended mutations", () => {
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
    await seedBase();
  });

  it("adds, updates, removes, reorders line items (DRAFT only)", async () => {
    const created = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ clientId: "CLT-EX-1", issueDate: "2026-01-01", dueDate: "2026-02-01", paymentTerms: "NET_30", taxRate: 0, lineItems: [{ description: "A", quantity: 1, rate: 100, manual: true }] })
      .expect(201);
    const id = created.body.data.id;

    const add = await request(app)
      .post(`/api/v1/invoices/${id}/line-items`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ description: "B", quantity: 1, rate: 50 })
      .expect(200);
    expect(add.body.data.lineItems).toHaveLength(2);

    const upd = await request(app)
      .patch(`/api/v1/invoices/${id}/line-items/${add.body.data.lineItems[1].id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ quantity: 2, rate: 50 })
      .expect(200);
    expect(upd.body.data.lineItems[1].amount).toBe(100);

    const reordered = await request(app)
      .post(`/api/v1/invoices/${id}/line-items/reorder`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ fromIndex: 1, toIndex: 0 })
      .expect(200);
    expect(reordered.body.data.lineItems[0].description).toBe("B");

    const removed = await request(app)
      .delete(`/api/v1/invoices/${id}/line-items/${reordered.body.data.lineItems[1].id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);
    expect(removed.body.data.lineItems).toHaveLength(1);
  });

  it("prevents removing last line item", async () => {
    const created = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ clientId: "CLT-EX-1", issueDate: "2026-01-01", dueDate: "2026-02-01", paymentTerms: "NET_30", taxRate: 0, lineItems: [{ description: "A", quantity: 1, rate: 100, manual: true }] })
      .expect(201);
    const id = created.body.data.id;
    const del = await request(app)
      .delete(`/api/v1/invoices/${id}/line-items/${created.body.data.lineItems[0].id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(422);
    expect(del.body.error.code).toBe("EMPTY_INVOICE_LINE_ITEMS");
  });

  it("updates invoice header", async () => {
    const created = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ clientId: "CLT-EX-1", issueDate: "2026-01-01", dueDate: "2026-02-01", paymentTerms: "NET_30", taxRate: 0, lineItems: [{ description: "A", quantity: 1, rate: 100, manual: true }] })
      .expect(201);
    const upd = await request(app)
      .patch(`/api/v1/invoices/${created.body.data.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ subject: "Updated", poNumber: "PO-1" })
      .expect(200);
    expect(upd.body.data.subject).toBe("Updated");
  });
});
