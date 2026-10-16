import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

const BASE_INVOICE = {
  invoiceId: "INV-2026-001",
  invoiceNumber: "INV-2026-001",
  clientId: "CLT-PDF-1",
  clientName: "Acme",
  clientCode: "CLT101",
  clientAddress: { line1: "1 Market St", city: "New York", state: "NY", postalCode: "10001", country: "United States" },
  poNumber: "6300006436",
  subject: "Professional Consulting",
  issueDate: "2026-07-01",
  dueDate: "2026-07-01",
  currency: "USD",
  paymentTerms: "DUE_ON_RECEIPT",
  taxRate: 0,
  taxAmount: 0,
  subtotal: 500,
  totalAmount: 500,
  amountPaid: 0,
  balanceDue: 500,
  status: "DRAFT",
  lineItems: [{ id: "LI-1", description: "Consulting", quantity: 1, rate: 500, amount: 500, manual: true, sortOrder: 0 }],
  notes: "Thanks for your business.",
  createdBy: "MANAGER",
  createdAt: new Date(),
  updatedAt: new Date()
};

async function seed(overrides: Record<string, unknown> = {}): Promise<void> {
  const db = getDb();
  await db.collection("invoices").deleteMany({});
  await db.collection("invoice_templates").deleteMany({});
  await db.collection("invoices").insertOne({ ...BASE_INVOICE, ...overrides } as never);
}

describe("Invoices PDF API", () => {
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

  it("serves the styled PDF for an existing invoice", async () => {
    const res = await request(app)
      .get("/api/v1/invoices/INV-2026-001/pdf")
      .set("Authorization", `Bearer ${managerToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain('inline; filename="INV-2026-001.pdf"');
    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(5000);
  });

  it("switches to attachment disposition with ?download=1", async () => {
    const res = await request(app)
      .get("/api/v1/invoices/INV-2026-001/pdf?download=1")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);
    expect(res.headers["content-disposition"]).toContain('attachment; filename="INV-2026-001.pdf"');
  });

  it("accepts an invoiceNumber as the lookup key", async () => {
    const res = await request(app)
      .get("/api/v1/invoices/INV-2026-001/pdf")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("paginates invoices with many line items across pages", async () => {
    const lineItems = Array.from({ length: 20 }, (_, i) => ({
      id: `LI-${i}`,
      description: `Resource #${i + 1}`,
      quantity: 1,
      rate: 1000,
      amount: 1000,
      manual: i % 2 === 0,
      sortOrder: i
    }));
    await seed({ lineItems, subtotal: 20000, totalAmount: 20000, balanceDue: 20000 });

    const res = await request(app)
      .get("/api/v1/invoices/INV-2026-001/pdf")
      .set("Authorization", `Bearer ${managerToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const body = (res.body as Buffer).toString("latin1");
    const pageCount = (body.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });

  it("applies the default invoice template branding without failing", async () => {
    const db = getDb();
    await db.collection("invoice_templates").insertOne({
      invoiceTemplateId: "ITM-1",
      name: "Standard",
      primaryColor: "#1D4ED8",
      footerNote: "Eniac Inc. — Thank you for your business.",
      isDefault: true,
      createdBy: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date()
    } as never);

    const res = await request(app)
      .get("/api/v1/invoices/INV-2026-001/pdf")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("returns 404 for an unknown invoice", async () => {
    const res = await request(app)
      .get("/api/v1/invoices/INV-999-999/pdf")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects unauthenticated access (401) and blocks EMPLOYEE (403)", async () => {
    await request(app).get("/api/v1/invoices/INV-2026-001/pdf").expect(401);
    const empToken = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).get("/api/v1/invoices/INV-2026-001/pdf").set("Authorization", `Bearer ${empToken}`).expect(403);
  });
});
