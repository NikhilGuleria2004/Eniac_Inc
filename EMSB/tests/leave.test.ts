import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");
  const leaveRequests = db.collection("leave_requests");
  const leaveBalances = db.collection("leave_balances");
  const leaveTypes = db.collection("leave_types");

  await employees.deleteMany({});
  await leaveRequests.deleteMany({});
  await leaveBalances.deleteMany({});
  await leaveTypes.deleteMany({});

  const testEmployees = [
    {
      employeeId: "EMP-LV-1",
      firstName: "Leave",
      lastName: "Owner",
      email: "leave.owner@test.com",
      phone: "+1-555-0001",
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      joiningDate: new Date("2024-01-01"),
      employmentType: "FULL_TIME",
      address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-LV-2",
      firstName: "Second",
      lastName: "Employee",
      email: "second.lv@test.com",
      phone: "+1-555-0002",
      designation: "Designer",
      department: "Design",
      country: "USA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      joiningDate: new Date("2024-02-01"),
      employmentType: "FULL_TIME",
      address: { line1: "456 St", city: "New York", state: "NY", country: "USA" },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const demoEmployeeIds = ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"];
  for (const employeeId of demoEmployeeIds) {
    testEmployees.push({
      employeeId,
      firstName: `Demo${employeeId}`,
      lastName: "User",
      email: `${employeeId.toLowerCase().replace("-", "")}@eniac.demo`,
      phone: "+1-555-0100",
      designation: "Staff",
      department: "Operations",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      joiningDate: new Date("2020-01-01"),
      employmentType: "FULL_TIME",
      address: { line1: "1 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  for (const emp of testEmployees) {
    await employees.updateOne({ employeeId: emp.employeeId }, { $set: emp }, { upsert: true });
  }

  // Seed leave balances for EMP-005 (the employee user)
  const balances = [
    { employeeId: "EMP-005", leaveType: "PAID", balance: 20 },
    { employeeId: "EMP-005", leaveType: "SICK", balance: 10 },
    { employeeId: "EMP-005", leaveType: "CASUAL", balance: 10 },
    { employeeId: "EMP-LV-1", leaveType: "PAID", balance: 20 },
    { employeeId: "EMP-LV-1", leaveType: "SICK", balance: 10 },
    { employeeId: "EMP-LV-2", leaveType: "PAID", balance: 20 }
  ];
  for (const b of balances) {
    await leaveBalances.updateOne(
      { employeeId: b.employeeId, leaveType: b.leaveType },
      { $set: { ...b, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  }

  // Seed leave types
  const leaveTypeConfigs = [
    { typeId: "LT-PAID", code: "PAID", name: "Paid Leave", annualAllowance: 20, requiresApproval: true, active: true },
    { typeId: "LT-SICK", code: "SICK", name: "Sick Leave", annualAllowance: 10, requiresApproval: true, active: true },
    { typeId: "LT-CASUAL", code: "CASUAL", name: "Casual Leave", annualAllowance: 10, requiresApproval: true, active: true },
    { typeId: "LT-UNPAID", code: "UNPAID", name: "Unpaid Leave", annualAllowance: 0, requiresApproval: true, active: true }
  ];
  for (const lt of leaveTypeConfigs) {
    await leaveTypes.updateOne(
      { code: lt.code },
      { $set: { ...lt, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  }

  await setupTestUsers();
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

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

describe("Phase 7 — Leave", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    const db = getDb();
    await db.collection("leave_requests").deleteMany({});
    // Reset balances
    await db.collection("leave_balances").updateOne(
      { employeeId: "EMP-005", leaveType: "PAID" },
      { $set: { balance: 20 } }
    );
    await db.collection("leave_balances").updateOne(
      { employeeId: "EMP-005", leaveType: "SICK" },
      { $set: { balance: 10 } }
    );
  });

  describe("POST /api/v1/leave/request", () => {
    it("EMPLOYEE can request leave for self", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(10),
          endDate: futureDate(12),
          reason: "Vacation"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.days).toBe(3);
    });

    it("rejects start date after end date (400)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(12),
          endDate: futureDate(10),
          reason: "Invalid"
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects insufficient leave balance (422)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "SICK",
          startDate: futureDate(10),
          endDate: futureDate(30),
          reason: "Long sick leave"
        })
        .expect(422);

      expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
    });

    it("rejects overlapping leave (422)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(50),
          endDate: futureDate(55),
          reason: "First"
        })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(53),
          endDate: futureDate(58),
          reason: "Overlapping"
        })
        .expect(422);

      expect(res.body.error.code).toBe("OVERLAPPING_LEAVE");
    });

    it("UNPAID leave does not require balance", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "UNPAID",
          startDate: futureDate(10),
          endDate: futureDate(40),
          reason: "Long unpaid"
        })
        .expect(201);

      expect(res.body.data.status).toBe("PENDING");
    });

    it("HR cannot request leave (403 - only employees request)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-LV-1",
          leaveType: "PAID",
          startDate: futureDate(10),
          endDate: futureDate(12),
          reason: "HR on behalf"
        })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("MANAGER cannot request leave (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(10),
          endDate: futureDate(12),
          reason: "Manager"
        })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("rejects invalid leave type (400)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "INVALID_TYPE",
          startDate: futureDate(10),
          endDate: futureDate(12),
          reason: "Bad type"
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/leave/:requestId/approve", () => {
    it("HR can approve a pending request and balance is decremented", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(100),
          endDate: futureDate(104),
          reason: "Approve test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVED");
      expect(res.body.data.approvedBy).toBe("HR");

      const db = getDb();
      const balance = await db.collection("leave_balances").findOne({ employeeId: "EMP-005", leaveType: "PAID" });
      expect(balance?.balance).toBe(15);
    });

    it("prevents approving an already-resolved request (422)", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(200),
          endDate: futureDate(202),
          reason: "Resolve test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");

      await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(422);

      expect(res.body.error.code).toBe("LEAVE_ALREADY_RESOLVED");
    });

    it("EMPLOYEE cannot approve leave (403)", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(300),
          endDate: futureDate(302),
          reason: "Self approve test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;

      const res = await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("MANAGER cannot approve leave (403)", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(400),
          endDate: futureDate(402),
          reason: "Manager approve test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;
      const mgrToken = await getAccessToken(app, "manager@eniacinc.com");

      const res = await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${mgrToken}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("POST /api/v1/leave/:requestId/reject", () => {
    it("HR can reject a pending request", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(500),
          endDate: futureDate(502),
          reason: "Reject test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");

      const res = await request(app)
        .post(`/api/v1/leave/${requestId}/reject`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ rejectionReason: "Not enough coverage" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("REJECTED");
      expect(res.body.data.reviewComment).toBe("Not enough coverage");
    });

    it("reject does not decrement balance", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(600),
          endDate: futureDate(602),
          reason: "Reject no decrement"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");

      await request(app)
        .post(`/api/v1/leave/${requestId}/reject`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ rejectionReason: "Rejected" })
        .expect(200);

      const db = getDb();
      const balance = await db.collection("leave_balances").findOne({ employeeId: "EMP-005", leaveType: "PAID" });
      expect(balance?.balance).toBe(20);
    });
  });

  describe("GET /api/v1/leave — List", () => {
    it("HR can list all leave requests", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own leave requests", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((req: { employeeId: string }) => {
        expect(req.employeeId).toBe("EMP-005");
      });
    });
  });

  describe("GET /api/v1/leave/:requestId — Detail", () => {
    it("EMPLOYEE can view own leave request", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(700),
          endDate: futureDate(702),
          reason: "Detail test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;

      const res = await request(app)
        .get(`/api/v1/leave/${requestId}`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(200);

      expect(res.body.data.requestId).toBe(requestId);
    });

    it("EMPLOYEE cannot view another employee's leave (IDOR)", async () => {
      const db = getDb();
      const { ObjectId } = await import("mongodb");
      const requestId = "LR-IDOR-TEST";
      await db.collection("leave_requests").insertOne({
        _id: new ObjectId(),
        requestId,
        employeeId: "EMP-LV-1",
        leaveType: "PAID",
        startDate: new Date(futureDate(800)),
        endDate: new Date(futureDate(802)),
        days: 3,
        reason: "IDOR test",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const empToken = await getAccessToken(app, "employee@eniacinc.com");

      const res = await request(app)
        .get(`/api/v1/leave/${requestId}`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for non-existent request", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave/LR-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/v1/leave/balances", () => {
    it("EMPLOYEE can view own balances", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave/balances")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((b: { employeeId: string }) => {
        expect(b.employeeId).toBe("EMP-005");
      });
    });

    it("HR can view all balances", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave/balances")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("HR can view specific employee balances", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave/balances/EMP-LV-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((b: { employeeId: string }) => {
        expect(b.employeeId).toBe("EMP-LV-1");
      });
    });

    it("EMPLOYEE cannot view another employee's balances (IDOR)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/leave/balances/EMP-LV-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for leave actions", async () => {
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${empToken}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(900),
          endDate: futureDate(902),
          reason: "Audit test"
        })
        .expect(201);

      const requestId = createRes.body.data.requestId;
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");

      await request(app)
        .post(`/api/v1/leave/${requestId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "leave_request" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "leave.requested")).toBe(true);
      expect(logs.some((l) => l.action === "leave.approved")).toBe(true);
    });
  });
});
