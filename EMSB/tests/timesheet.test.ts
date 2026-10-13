import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");

  await employees.deleteMany({});
  await db.collection("timesheet_provisioning").deleteMany({});
  await db.collection("onboarding_records").deleteMany({});

  for (let i = 0; i < 5; i++) {
    await employees.updateOne(
      { employeeId: `EMP-${String(i + 1).padStart(3, "0")}` },
      {
        $set: {
          employeeId: `EMP-${String(i + 1).padStart(3, "0")}`,
          firstName: `Emp${i + 1}`,
          lastName: "User",
          email: `emp${i + 1}@test.com`,
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: "ACTIVE",
          billingStatus: i % 2 === 0 ? "BILLABLE" : "NON_BILLABLE",
          joiningDate: new Date("2020-01-01"),
          employmentType: "FULL_TIME",
          address: { city: "Pune", state: "MH", country: "INDIA" },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
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

describe("Phase 13 — Timesheet Integration", () => {
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
    await db.collection("timesheet_provisioning").deleteMany({});
  });

  describe("Eligibility: ACTIVE + BILLABLE → ELIGIBLE", () => {
    it("ACTIVE + BILLABLE → ELIGIBLE", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      // EMP-001 is ACTIVE + BILLABLE (i=0 → BILLABLE)
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("ELIGIBLE");
      expect(res.body.data.eligible).toBe(true);
    });

    it("ACTIVE + NON_BILLABLE → NOT_ELIGIBLE", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      // EMP-002 is ACTIVE + NON_BILLABLE (i=1)
      const res = await request(app)
        .get("/api/v1/employees/EMP-002/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("NOT_ELIGIBLE");
      expect(res.body.data.eligible).toBe(false);
    });

    it("ONBOARDING + BILLABLE → NOT_ELIGIBLE", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();
      await db.collection("employees").updateOne(
        { employeeId: "EMP-003" },
        { $set: { employmentStatus: "ONBOARDING", billingStatus: "BILLABLE" } }
      );
      await db.collection("onboarding_records").updateOne(
        { employeeId: "EMP-003" },
        { $set: { employeeId: "EMP-003", status: "IN_PROGRESS", currentStage: "EMPLOYEE_INFORMATION", completedStages: [], documentRequirements: [], createdAt: new Date(), updatedAt: new Date() } },
        { upsert: true }
      );

      const res = await request(app)
        .get("/api/v1/employees/EMP-003/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("NOT_ELIGIBLE");
      expect(res.body.data.eligible).toBe(false);
    });

    it("TERMINATED → NOT_ELIGIBLE", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();
      await db.collection("employees").updateOne(
        { employeeId: "EMP-004" },
        { $set: { employmentStatus: "TERMINATED", billingStatus: "BILLABLE" } }
      );

      const res = await request(app)
        .get("/api/v1/employees/EMP-004/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("NOT_ELIGIBLE");
      expect(res.body.data.eligible).toBe(false);
    });
  });

  describe("POST /api/v1/employees/:employeeId/timesheet/provision", () => {
    it("rejects provision when status is not FAILED (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      // First create an ELIGIBLE record
      await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_PROVISION_STATE");
    });

    it("manual retry from FAILED → PROVISIONED", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();
      // Seed a FAILED provisioning record
      await db.collection("timesheet_provisioning").updateOne(
        { employeeId: "EMP-001" },
        {
          $set: {
            employeeId: "EMP-001",
            status: "FAILED",
            eligible: true,
            failureReason: "Simulated external failure",
            lastAttemptAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      const res = await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("PROVISIONED");
      expect(res.body.data.provisionedAt).toBeDefined();
    });

    it("EMPLOYEE cannot provision (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-NONEXISTENT/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/v1/employees/:employeeId/timesheet/disable", () => {
    it("HR can disable provisioning", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/disable")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("DISABLED");
      expect(res.body.data.disabledAt).toBeDefined();
    });

    it("EMPLOYEE cannot disable (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/disable")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Authorization", () => {
    it("MANAGER can view timesheet status", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("SUPERVISOR can view timesheet status", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("EMPLOYEE cannot view timesheet status (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("requires authentication (401)", async () => {
      const res = await request(app)
        .get("/api/v1/employees/EMP-001/timesheet")
        .expect(401);

      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for provisioning", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();
      await db.collection("timesheet_provisioning").updateOne(
        { employeeId: "EMP-001" },
        { $set: { employeeId: "EMP-001", status: "FAILED", eligible: true, failureReason: "test", createdAt: new Date(), updatedAt: new Date() } },
        { upsert: true }
      );

      await request(app)
        .post("/api/v1/employees/EMP-001/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const logs = await db.collection("audit_logs")
        .find({ entityType: "timesheet" })
        .toArray();

      expect(logs.some((l) => l.action === "timesheet.provisioned")).toBe(true);
    });
  });
});
