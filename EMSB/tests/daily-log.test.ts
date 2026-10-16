import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

const WEEKDAY = "2026-01-05"; // Monday
const SATURDAY = "2026-01-03"; // Saturday

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

async function seed() {
  const db = getDb();
  await db.collection("daily_logs").deleteMany({});
  await db.collection("project_assignments").deleteMany({});
  await db.collection("projects").deleteMany({});
  await db.collection("clients").deleteMany({});

  await db.collection("employees").updateOne(
    { employeeId: "EMP-005" },
    { $set: { employeeId: "EMP-005", firstName: "Employee", lastName: "User", email: "employee@eniacinc.com", designation: "Engineer", department: "Engineering", country: "INDIA", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  await db.collection("employees").updateOne(
    { employeeId: "EMP-006" },
    { $set: { employeeId: "EMP-006", firstName: "Amy", lastName: "Lee", email: "amy@eniacinc.com", designation: "Engineer", department: "Engineering", country: "INDIA", employmentStatus: "ACTIVE", billingStatus: "BILLABLE", createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );

  await db.collection("clients").insertOne({ clientId: "CLT-DL-1", name: "Acme", status: "ACTIVE", createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() });
  await db.collection("projects").insertMany([
    { projectId: "PRJ-DL-1", clientId: "CLT-DL-1", name: "Apollo", status: "ACTIVE", health: "ON_TRACK", progressPercent: 0, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { projectId: "PRJ-DL-2", clientId: "CLT-DL-1", name: "Zephyr", status: "ACTIVE", health: "ON_TRACK", progressPercent: 0, createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() }
  ]);
  await db.collection("project_assignments").insertMany([
    { assignmentId: "ASN-DL-1", employeeId: "EMP-005", projectId: "PRJ-DL-1", billable: true, status: "ACTIVE", allocationPercent: 100, startDate: new Date(), createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { assignmentId: "ASN-DL-2", employeeId: "EMP-006", projectId: "PRJ-DL-2", billable: true, status: "ACTIVE", allocationPercent: 100, startDate: new Date(), createdBy: "ADMIN", createdAt: new Date(), updatedAt: new Date() }
  ]);
}

describe("CMS Phase 5 — Daily Logs API", () => {
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

  it("EMPLOYEE with an ACTIVE assignment can create a weekday log", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "PRJ-DL-1", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "Implemented API endpoints", regularHours: 8, overtimeHours: 0, billingType: "BILLABLE", status: "SUBMITTED" })
      .expect(201);
    expect(res.body.data.totalHours).toBe(8);
    expect(res.body.data.dayOfWeek).toBe("Mon");
    expect(res.body.data.status).toBe("SUBMITTED");
    expect(res.body.data.billable).toBe(true);
  });

  it("allows overtime on a Saturday but not on a weekday", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const ok = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "PRJ-DL-1", workDate: SATURDAY, taskCategory: "DEVELOPMENT", description: "Weekend deployment work", regularHours: 6, overtimeHours: 3, billingType: "BILLABLE" })
      .expect(201);
    expect(ok.body.data.totalHours).toBe(9);

    const bad = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "PRJ-DL-1", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "Weekday overtime attempt", regularHours: 8, overtimeHours: 2, billingType: "BILLABLE" });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("OVERTIME_NOT_ALLOWED");
  });

  it("rejects > 24 total hours", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "PRJ-DL-1", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "Too many hours logged", regularHours: 23, overtimeHours: 2, billingType: "BILLABLE" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents duplicate logs for same employee + project + date", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const payload = { projectId: "PRJ-DL-1", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "First entry of the day", regularHours: 8, overtimeHours: 0, billingType: "BILLABLE" };
    await request(app).post("/api/v1/daily-logs").set("Authorization", `Bearer ${token}`).send(payload).expect(201);
    const dup = await request(app).post("/api/v1/daily-logs").set("Authorization", `Bearer ${token}`).send({ ...payload, description: "Second entry of the day" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("CONFLICT");
  });

  it("rejects logging to a project the employee is not assigned to", async () => {
    const token = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: "PRJ-DL-2", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "Not my project", regularHours: 8, overtimeHours: 0, billingType: "BILLABLE" });
    expect(res.status).toBe(403);
  });

  it("stops an EMPLOYEE from reading another employee's log", async () => {
    const adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
    const created = await request(app)
      .post("/api/v1/daily-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ employeeId: "EMP-006", projectId: "PRJ-DL-2", workDate: WEEKDAY, taskCategory: "DEVELOPMENT", description: "Amy logs her hours", regularHours: 8, overtimeHours: 0, billingType: "BILLABLE" })
      .expect(201);
    const empToken = await getAccessToken(app, "employee@eniacinc.com");
    const res = await request(app).get(`/api/v1/daily-logs/${created.body.data.id}`).set("Authorization", `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  it("HR has no CMS access (403)", async () => {
    const token = await getAccessToken(app, "hreniac@eniacinc.com");
    await request(app).get("/api/v1/daily-logs").set("Authorization", `Bearer ${token}`).expect(403);
  });
});
