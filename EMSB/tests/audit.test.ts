import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { ObjectId } from "mongodb";

async function setupUsers() {
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

async function seedAuditLogs() {
  const db = getDb();
  const now = new Date();

  const testLogs = [
    {
      _id: new ObjectId(),
      auditId: "AUD-test-1",
      actorUserId: "user_admin",
      actorRole: "ADMIN",
      action: "employee.updated",
      entityType: "employee",
      entityId: "EMP-001",
      before: { status: "INACTIVE" },
      after: { status: "ACTIVE" },
      requestId: "req-123",
      ipAddress: "127.0.0.1",
      createdAt: new Date(now.getTime() - 86400000),
      updatedAt: new Date(now.getTime() - 86400000)
    },
    {
      _id: new ObjectId(),
      auditId: "AUD-test-2",
      actorUserId: "user_hr",
      actorRole: "HR",
      action: "salary.updated",
      entityType: "employee",
      entityId: "EMP-002",
      before: { salary: 50000 },
      after: { salary: 55000 },
      requestId: "req-456",
      ipAddress: "127.0.0.1",
      createdAt: new Date(now.getTime() - 172800000),
      updatedAt: new Date(now.getTime() - 172800000)
    },
    {
      _id: new ObjectId(),
      auditId: "AUD-test-3",
      actorUserId: "user_manager",
      actorRole: "MANAGER",
      action: "project.updated",
      entityType: "project",
      entityId: "PROJ-001",
      before: { status: "ACTIVE" },
      after: { status: "COMPLETED" },
      requestId: "req-789",
      ipAddress: "127.0.0.1",
      createdAt: new Date(now.getTime() - 259200000),
      updatedAt: new Date(now.getTime() - 259200000)
    }
  ];

  await db.collection("audit_logs").deleteMany({});
  await db.collection("audit_logs").insertMany(testLogs);
}

describe("Phase 15 — Audit", () => {
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
    await seedAuditLogs();
  });

  describe("GET /api/v1/audit-log — List", () => {
    it("ADMIN can list audit logs", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
    });

    it("filters by actorRole", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?actorRole=HR")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].actorRole).toBe("HR");
    });

    it("filters by action", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?action=employee.updated")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe("employee.updated");
    });

    it("filters by entityType and entityId", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?entityType=project&entityId=PROJ-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].entityType).toBe("project");
      expect(res.body.data[0].entityId).toBe("PROJ-001");
    });

    it("filters by requestId", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?requestId=req-123")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].requestId).toBe("req-123");
    });

    it("supports pagination", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?page=1&pageSize=2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.pageSize).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.hasNextPage).toBe(true);
      expect(res.body.pagination.hasPreviousPage).toBe(false);
    });

    it("validates pageSize within range", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log?pageSize=200")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("unauthenticated requests receive 401", async () => {
      const res = await request(app).get("/api/v1/audit-log").expect(401);

      expect(res.body.success).toBe(false);
    });

    it("HR cannot access audit logs (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it("MANAGER cannot access audit logs (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it("SUPERVISOR cannot access audit logs (403)", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it("EMPLOYEE cannot access audit logs (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/audit-log/:auditId — Get by ID", () => {
    it("ADMIN can get a single audit log by ID", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log/AUD-test-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.auditId).toBe("AUD-test-1");
      expect(res.body.data.action).toBe("employee.updated");
      expect(res.body.data.actorRole).toBe("ADMIN");
      expect(res.body.data.entityType).toBe("employee");
      expect(res.body.data.entityId).toBe("EMP-001");
      expect(res.body.data.before).toEqual({ status: "INACTIVE" });
      expect(res.body.data.after).toEqual({ status: "ACTIVE" });
      expect(res.body.data.createdAt).toBeDefined();
    });

    it("returns 404 for non-existent audit log", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log/AUD-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it("non-admin roles cannot access individual audit logs (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/audit-log/AUD-test-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it("unauthenticated requests receive 401", async () => {
      const res = await request(app)
        .get("/api/v1/audit-log/AUD-test-1")
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe("Audit attribution (request context)", () => {
    it("attributes records to the acting user with request metadata", async () => {
      const db = getDb();
      await db.collection("employees").deleteMany({ employeeId: "EMP-AUDIT-1" });
      await db.collection("audit_logs").deleteMany({ action: "employee.created", entityId: "EMP-AUDIT-1" });

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-AUDIT-1",
          firstName: "Audit",
          lastName: "Tester",
          email: "audit.tester@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(201);

      const requestId = createRes.headers["x-request-id"] as string;
      expect(requestId).toBeTruthy();

      const adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
      const auditRes = await request(app)
        .get("/api/v1/audit-log")
        .query({ action: "employee.created", requestId })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(auditRes.body.data.length).toBe(1);
      const entry = auditRes.body.data[0];
      expect(entry.actorUserId).toBe("user_hr");
      expect(entry.actorRole).toBe("HR");
      expect(entry.requestId).toBe(requestId);
      expect(entry.ipAddress).toBeTruthy();
    });

    it("records the acting user id (not the employee id) when an employee marks attendance", async () => {
      const db = getDb();
      await db.collection("employees").updateOne(
        { employeeId: "EMP-005" },
        {
          $set: {
            employeeId: "EMP-005",
            firstName: "Employee",
            lastName: "User",
            email: "employee@eniacinc.com",
            designation: "Engineer",
            department: "Engineering",
            country: "INDIA",
            employmentStatus: "ACTIVE",
            billingStatus: "NON_BILLABLE",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      await db.collection("attendance_records").deleteMany({ employeeId: "EMP-005" });
      await db.collection("audit_logs").deleteMany({ action: "attendance.checked_in", entityType: "attendance" });

      const token = await getAccessToken(app, "employee@eniacinc.com");
      const checkInRes = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const requestId = checkInRes.headers["x-request-id"] as string;

      const adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
      const auditRes = await request(app)
        .get("/api/v1/audit-log")
        .query({ action: "attendance.checked_in", requestId })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(auditRes.body.data.length).toBe(1);
      const entry = auditRes.body.data[0];
      expect(entry.actorUserId).toBe("user_employee");
      expect(entry.actorRole).toBe("EMPLOYEE");
      expect(entry.requestId).toBe(requestId);
      expect(entry.ipAddress).toBeTruthy();
    });

    it("records audit entries without request context outside a request (e.g. seed)", async () => {
      const { writeAuditLog } = await import("../src/utils/audit.js");
      await writeAuditLog("ADMIN", "seed.test_action", "system", "test-entity");

      const adminToken = await getAccessToken(app, "superadmin@eniacinc.com");
      const auditRes = await request(app)
        .get("/api/v1/audit-log")
        .query({ action: "seed.test_action" })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(auditRes.body.data.length).toBe(1);
      const entry = auditRes.body.data[0];
      expect(entry.actorUserId ?? null).toBeNull();
      expect(entry.requestId ?? null).toBeNull();
      expect(entry.actorRole).toBe("ADMIN");
    });
  });
});
