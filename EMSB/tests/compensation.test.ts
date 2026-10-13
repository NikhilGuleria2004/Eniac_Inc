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
  await db.collection("employee_compensation_history").deleteMany({});
  await db.collection("employee_bill_rate_history").deleteMany({});

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
          billingStatus: "BILLABLE",
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

describe("Phase 12 — Compensation", () => {
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
    await db.collection("employees").updateOne(
      { employeeId: "EMP-005" },
      { $unset: { compensation: "", billRate: "" } }
    );
    await db.collection("employee_compensation_history").deleteMany({});
    await db.collection("employee_bill_rate_history").deleteMany({});
  });

  describe("GET /api/v1/employees/:employeeId/compensation", () => {
    it("HR can view compensation", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.salary).toBeNull();
      expect(res.body.data.billRate).toBeNull();
    });

    it("ADMIN can view compensation", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("MANAGER cannot view compensation (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("SUPERVISOR cannot view compensation (403)", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("EMPLOYEE cannot view compensation (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-NONEXISTENT/compensation")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/employees/:employeeId/compensation", () => {
    it("HR can set salary", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({
          salary: { currency: "INR", amount: 500000, payFrequency: "YEARLY" },
          reason: "Initial salary"
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.salary.currency).toBe("INR");
      expect(res.body.data.salary.amount).toBe(500000);
      expect(res.body.data.salary.payFrequency).toBe("YEARLY");
    });

    it("HR can set bill rate", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({
          billRate: { currency: "INR", amount: 1500, unit: "DAILY" }
        })
        .expect(200);

      expect(res.body.data.billRate.amount).toBe(1500);
      expect(res.body.data.billRate.unit).toBe("DAILY");
    });

    it("ADMIN can set compensation", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 600000, payFrequency: "YEARLY" } })
        .expect(200);

      expect(res.body.data.salary.amount).toBe(600000);
    });

    it("MANAGER cannot set compensation (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 999999, payFrequency: "YEARLY" } })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("EMPLOYEE cannot set compensation (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 999999, payFrequency: "YEARLY" } })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("rejects non-positive amount (400)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: -100, payFrequency: "YEARLY" } })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty body (400)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-NONEXISTENT/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 500000, payFrequency: "YEARLY" } })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Compensation history", () => {
    it("tracks salary history on update", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 500000, payFrequency: "YEARLY" } })
        .expect(200);

      await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 550000, payFrequency: "YEARLY" } })
        .expect(200);

      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation/salary-history")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      // Most recent first
      expect(res.body.data[0].amount).toBe(550000);
      expect(res.body.data[1].amount).toBe(500000);
    });

    it("tracks bill rate history on update", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ billRate: { currency: "INR", amount: 1500, unit: "DAILY" } })
        .expect(200);

      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation/bill-rate-history")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].amount).toBe(1500);
    });

    it("MANAGER cannot view salary history (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/compensation/salary-history")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for compensation changes", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .patch("/api/v1/employees/EMP-005/compensation")
        .set("Authorization", `Bearer ${token}`)
        .send({ salary: { currency: "INR", amount: 500000, payFrequency: "YEARLY" } })
        .expect(200);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "employee" })
        .toArray();

      expect(logs.some((l) => l.action === "salary.updated")).toBe(true);
    });
  });
});
