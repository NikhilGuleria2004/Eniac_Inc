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

describe("CMS Phase 10 — Invoice Templates", () => {
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
    await getDb().collection("invoice_templates").deleteMany({});
    managerToken = await getAccessToken(app, "manager@eniacinc.com");
  });

  it("MANAGER can create a template", async () => {
    const res = await request(app)
      .post("/api/v1/invoice-templates")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Standard", primaryColor: "#1D4ED8", isDefault: true })
      .expect(201);
    expect(res.body.data.invoiceTemplateId).toMatch(/^TPL-/);
    expect(res.body.data.isDefault).toBe(true);
  });

  it("default is a singleton (setting a new default unsets the previous)", async () => {
    const a = await request(app).post("/api/v1/invoice-templates").set("Authorization", `Bearer ${managerToken}`).send({ name: "A", primaryColor: "#111111", isDefault: true }).expect(201);
    const b = await request(app).post("/api/v1/invoice-templates").set("Authorization", `Bearer ${managerToken}`).send({ name: "B", primaryColor: "#222222", isDefault: true }).expect(201);
    const list = await request(app).get("/api/v1/invoice-templates").set("Authorization", `Bearer ${managerToken}`).expect(200);
    const defaults = list.body.data.filter((t: { isDefault: boolean }) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].invoiceTemplateId).toBe(b.body.data.invoiceTemplateId);
    expect(a.body.data.isDefault).toBe(true);
  });

  it("set-default switches the default", async () => {
    const a = await request(app).post("/api/v1/invoice-templates").set("Authorization", `Bearer ${managerToken}`).send({ name: "A", primaryColor: "#111111", isDefault: true }).expect(201);
    const b = await request(app).post("/api/v1/invoice-templates").set("Authorization", `Bearer ${managerToken}`).send({ name: "B", primaryColor: "#222222" }).expect(201);
    void a;
    const admin = await getAccessToken(app, "superadmin@eniacinc.com");
    await request(app).post(`/api/v1/invoice-templates/${b.body.data.invoiceTemplateId}/default`).set("Authorization", `Bearer ${admin}`).send({}).expect(200);
    const list = await request(app).get("/api/v1/invoice-templates").set("Authorization", `Bearer ${admin}`).expect(200);
    const defaults = list.body.data.filter((t: { isDefault: boolean }) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].invoiceTemplateId).toBe(b.body.data.invoiceTemplateId);
  });

  it("EMPLOYEE/SUPERVISOR are blocked from invoice templates", async () => {
    const emp = await getAccessToken(app, "employee@eniacinc.com");
    await request(app).get("/api/v1/invoice-templates").set("Authorization", `Bearer ${emp}`).expect(403);
    const sup = await getAccessToken(app, "supervisor@eniacinc.com");
    await request(app).post("/api/v1/invoice-templates").set("Authorization", `Bearer ${sup}`).send({ name: "X", primaryColor: "#000000" }).expect(403);
  });
});
