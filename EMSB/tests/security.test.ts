import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { initializeIndexes } from "../src/config/init-db.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");

  await employees.deleteMany({});
  await db.collection("clients").deleteMany({});
  await db.collection("projects").deleteMany({});
  await db.collection("project_assignments").deleteMany({});
  await db.collection("documents").deleteMany({});
  await db.collection("leave_requests").deleteMany({});
  await db.collection("leave_balances").deleteMany({});
  await db.collection("attendance_records").deleteMany({});
  await db.collection("employee_compensation_history").deleteMany({});
  await db.collection("employee_bill_rate_history").deleteMany({});
  await db.collection("employee_reviews").deleteMany({});
  await db.collection("audit_logs").deleteMany({});
  await db.collection("settings").deleteMany({});

  await setupTestUsers();

  for (const testUser of TEST_USERS) {
    await employees.updateOne(
      { employeeId: testUser.employeeId },
      {
        $set: {
          employeeId: testUser.employeeId,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          designation: "Test",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: "ACTIVE",
          billingStatus: "BILLABLE",
          joiningDate: new Date("2020-01-01"),
          employmentType: "FULL_TIME",
          address: { city: "Pune", state: "MH", country: "INDIA" },
          compensation: { currency: "USD", salary: 100000, payFrequency: "MONTHLY" },
          billRate: { currency: "USD", amount: 50, unit: "HOURLY" },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  // Create a document for testing
  const { ObjectId } = await import("mongodb");
  await db.collection("documents").insertOne({
    _id: new ObjectId(),
    documentId: "DOC-001",
    employeeId: "EMP-005",
    type: "RESUME",
    name: "Test Resume",
    status: "APPROVED",
    confidential: false,
    url: "/docs/resume.pdf",
    uploadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create a confidential document
  await db.collection("documents").insertOne({
    _id: new ObjectId(),
    documentId: "DOC-002",
    employeeId: "EMP-005",
    type: "EMPLOYMENT_AGREEMENT",
    name: "Employment Agreement",
    status: "APPROVED",
    confidential: true,
    url: "/docs/agreement.pdf",
    uploadedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create a leave request
  await db.collection("leave_requests").insertOne({
    _id: new ObjectId(),
    requestId: "LR-0001",
    employeeId: "EMP-005",
    leaveType: "PAID",
    startDate: new Date("2026-10-15"),
    endDate: new Date("2026-10-16"),
    days: 2,
    reason: "Vacation",
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create leave balance
  await db.collection("leave_balances").insertOne({
    _id: new ObjectId(),
    employeeId: "EMP-005",
    leaveType: "PAID",
    balance: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create a client
  await db.collection("clients").insertOne({
    _id: new ObjectId(),
    clientId: "CL-001",
    code: "CLI-001",
    name: "Test Client",
    contactPerson: "John Doe",
    email: "john@test.com",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create a project
  await db.collection("projects").insertOne({
    _id: new ObjectId(),
    projectId: "PRJ-001",
    code: "PRJ-001",
    name: "Test Project",
    clientId: "CL-001",
    managerId: "EMP-003",
    startDate: new Date("2026-01-01"),
    status: "ACTIVE",
    progress: 50,
    health: "ON_TRACK",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create a project assignment
  await db.collection("project_assignments").insertOne({
    _id: new ObjectId(),
    assignmentId: "PA-001",
    employeeId: "EMP-005",
    projectId: "PRJ-001",
    role: "Developer",
    allocationPercentage: 100,
    startDate: new Date("2026-01-01"),
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create an audit log
  await db.collection("audit_logs").insertOne({
    _id: new ObjectId(),
    auditId: "AUD-0001",
    actorUserId: "user_admin",
    action: "employee.updated",
    entityType: "employee",
    entityId: "EMP-001",
    createdAt: new Date(),
    ipAddress: "127.0.0.1"
  });
}

function getApp(): Express {
  return createApp();
}

async function getAccessToken(app: Express, email: string): Promise<string> {
  const user = TEST_USERS.find((u) => u.email === email);
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: user?.password ?? "demo123" });
  return res.body.data.accessToken;
}

describe("Phase 19 — Security Audit", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await initializeIndexes();
    await setupUsers();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Admin — Full Access", () => {
    let adminToken: string;

    beforeAll(async () => {
      adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
    });

    it("can access employees", async () => {
      await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("can access employee detail with salary", async () => {
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/compensation")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.salary).toBeDefined();
      expect(res.body.data.billRate).toBeDefined();
    });

    it("can access audit log", async () => {
      await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("can access settings", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("can update settings", async () => {
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          settings: [{ key: "organization_timezone", category: "organization", value: "UTC" }]
        })
        .expect(200);
    });

    it("can access reports", async () => {
      await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("CANNOT mark attendance (security policy)", async () => {
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(403);
    });

    it("CANNOT mark attendance for another employee (403)", async () => {
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ employeeId: "EMP-005" })
        .expect(403);
    });
  });

  describe("Admin — Attendance Marking Blocked", () => {
    let adminToken: string;

    beforeAll(async () => {
      adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
    });

    it("cannot mark attendance for another employee", async () => {
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ employeeId: "EMP-005" })
        .expect(403);
    });
  });

  describe("HR — Full HR Access", () => {
    let hrToken: string;

    beforeAll(async () => {
      hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
    });

    it("can access employee list", async () => {
      await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can access employee detail with salary", async () => {
      const res = await request(app)
        .get("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      expect(res.body.data.compensation).toBeDefined();
      expect(res.body.data.billRate).toBeDefined();
    });

    it("can access documents", async () => {
      await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can access attendance", async () => {
      await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can access leave management", async () => {
      await request(app)
        .get("/api/v1/leave")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can access reviews", async () => {
      await request(app)
        .get("/api/v1/reviews")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can access salary/bill rate", async () => {
      const res = await request(app)
        .get("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      expect(res.body.data.compensation).toBeDefined();
    });

    it("can access reports", async () => {
      await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("can view settings (settings.view)", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);
    });

    it("cannot update settings (settings.manage missing)", async () => {
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          settings: [{ key: "organization_timezone", category: "organization", value: "UTC" }]
        })
        .expect(403);
    });
  });

  describe("Manager — Operational Access Only", () => {
    let managerToken: string;

    beforeAll(async () => {
      managerToken = await getAccessToken(app, "manager@eniacinc.com");
    });

    it("can access clients", async () => {
      await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);
    });

    it("can access projects", async () => {
      await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);
    });

    it("can access assignments", async () => {
      await request(app)
        .get("/api/v1/assignments")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);
    });

    it("can view operational employee data", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-003")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(200);
    });

    it("CANNOT see salary (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-003/compensation")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(403);
    });

    it("CANNOT see confidential documents (403)", async () => {
      await request(app)
        .get("/api/v1/documents/DOC-002")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(403);
    });

    it("CANNOT access audit log (403)", async () => {
      await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(403);
    });

    it("CANNOT access system settings (403)", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(403);
    });

    it("CANNOT view employee salary via compensation endpoint (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-001/compensation")
        .set("Authorization", `Bearer ${managerToken}`)
        .expect(403);
    });
  });

  describe("Supervisor — Limited Operational Access", () => {
    let supervisorToken: string;

    beforeAll(async () => {
      supervisorToken = await getAccessToken(app, "supervisor@eniacinc.com");
    });

    it("can access projects", async () => {
      await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(200);
    });

    it("can access assignments", async () => {
      await request(app)
        .get("/api/v1/assignments")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(200);
    });

    it("can view operational employee info", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-004")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(200);
    });

    it("CANNOT access HR data — employee compensation (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-003/compensation")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it("CANNOT access salary (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-004/compensation")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it("CANNOT access confidential documents (403)", async () => {
      await request(app)
        .get("/api/v1/documents/DOC-002")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it("CANNOT access audit log (403)", async () => {
      await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it("CANNOT access HR settings (403)", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it("CANNOT access reports (403)", async () => {
      await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${supervisorToken}`)
        .expect(403);
    });
  });

  describe("Employee — Self Access Only", () => {
    let employeeToken: string;

    beforeAll(async () => {
      employeeToken = await getAccessToken(app, "employee@eniacinc.com");
    });

    it("can view own profile", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);
    });

    it("can edit self-service fields", async () => {
      await request(app)
        .patch("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ firstName: "Updated" })
        .expect(200);
    });

    it("can view own attendance", async () => {
      await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);
    });

    it("can mark attendance check-in", async () => {
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({})
        .expect(201);
    });

    it("can view own leave balance", async () => {
      await request(app)
        .get("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);
    });

    it("can request leave", async () => {
      await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          leaveType: "PAID",
          startDate: "2026-12-01",
          endDate: "2026-12-02",
          days: 2
        })
        .expect(201);
    });

    it("can view own documents", async () => {
      await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);
    });

    it("CANNOT access another employee (403/404)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-003")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(404);
    });

    it("CANNOT access salary (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access bill rate (403)", async () => {
      await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access clients (403)", async () => {
      await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access system reports (403)", async () => {
      await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access audit log (403)", async () => {
      await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access settings (403)", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });

    it("CANNOT access onboarding (403)", async () => {
      await request(app)
        .get("/api/v1/onboarding")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe("Unauthenticated Access", () => {
    it("returns 401 for /employees", async () => {
      await request(app).get("/api/v1/employees").expect(401);
    });

    it("returns 401 for /settings", async () => {
      await request(app).get("/api/v1/settings").expect(401);
    });

    it("returns 401 for /reports/workforce-headcount", async () => {
      await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .expect(401);
    });

    it("returns 401 for /audit-log", async () => {
      await request(app).get("/api/v1/audit-log").expect(401);
    });

    it("returns 401 for /clients", async () => {
      await request(app).get("/api/v1/clients").expect(401);
    });

    it("returns 404 for unknown endpoint", async () => {
      await request(app)
        .get("/api/v1/unknown-endpoint")
        .set("Authorization", `Bearer ${""}`)
        .expect(404);
    });
  });
});
