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
  await db.collection("clients").deleteMany({});
  await db.collection("clients").insertOne({ clientId: "CLT-O1", name: "Client", code: "CLTO1", status: "ACTIVE", createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() } as never);
  await db.collection("invoices").insertOne({
    invoiceId: "INV-2026-100",
    invoiceNumber: "INV-2026-100",
    clientId: "CLT-O1",
    clientName: "Client",
    clientCode: "CLTO1",
    subject: "S",
    issueDate: "2026-02-01",
    dueDate: "2026-03-01",
    currency: "USD",
    paymentTerms: "NET_30",
    taxRate: 0,
    taxAmount: 0,
    subtotal: 100,
    totalAmount: 100,
    amountPaid: 0,
    balanceDue: 100,
    status: "SENT",
    lineItems: [],
    createdBy: "MANAGER",
    createdAt: new Date(),
    updatedAt: new Date(),
    periodStart: "2026-02-01",
    periodEnd: "2026-02-15",
  } as never);
}

describe("invoice overlaps endpoint", () => {
  let app: Express;
  let managerToken: string;

  beforeAll(async () => { await connectDatabase(); await setupTestUsers(); app = createApp(); });
  afterAll(async () => { await closeDatabase(); });
  beforeEach(async () => { managerToken = await getAccessToken(app, "manager@eniacinc.com"); await seed(); });

  it("returns overlapping open invoices", async () => {
    const res = await request(app)
      .get("/api/v1/invoices/overlaps")
      .set("Authorization", `Bearer ${managerToken}`)
      .query({ clientId: "CLT-O1", periodStart: "2026-02-10", periodEnd: "2026-02-20" })
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
