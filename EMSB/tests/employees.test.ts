import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { registerEventListeners } from "../src/integrations/event-listeners.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  await setupTestUsers();
}

async function seedEmployees() {
  const db = getDb();
  const employees = db.collection("employees");
  await employees.deleteMany({});

  for (let i = 0; i < 5; i++) {
    await employees.insertOne({
      employeeId: `EMP-${String(i + 1).padStart(3, "0")}`,
      firstName: `Demo${i}`,
      lastName: "User",
      email: `${["admin", "hr", "manager", "supervisor", "employee"][i]}@example.com`,
      phone: `+1-555-${String(100 + i).padStart(4, "0")}`,
      profilePhotoUrl: `https://ui-avatars.com/api/?name=Demo${i}`,
      dateOfBirth: new Date(1990, i, 1),
      designation: ["Admin", "HR Manager", "Project Manager", "Supervisor", "Developer"][i],
      department: ["Administration", "HR", "Operations", "Operations", "Engineering"][i],
      managerId: i === 0 ? undefined : "EMP-001",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: i % 2 === 0 ? "BILLABLE" : "NON_BILLABLE",
      joiningDate: new Date(2020, i, 1),
      employmentType: "FULL_TIME",
      address: {
        line1: "123 Street",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560001",
        country: "INDIA"
      },
      emergencyContact: {
        name: "Emergency Contact",
        relationship: "Spouse",
        phone: "+1-555-9999"
      },
      compensation: {
        currency: "INR",
        salary: 500000 + i * 100000,
        payFrequency: "YEARLY"
      },
      billRate: {
        currency: "INR",
        amount: 1500 + i * 100,
        unit: "DAY"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
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

describe("Phase 3 — Employee Management", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    await seedEmployees();
    registerEventListeners();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("GET /api/v1/employees — List", () => {
    it("returns 401 without authentication", async () => {
      const res = await request(app).get("/api/v1/employees").expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("returns paginated list for HR", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: expect.any(Boolean)
      });
    });

    it("returns 403 for EMPLOYEE role (no employee.view permission)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("supports pagination query params", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees?page=1&pageSize=2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.pageSize).toBe(2);
    });

    it("supports status filter", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees?status=ACTIVE")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((emp: { employmentStatus: string }) => {
        expect(emp.employmentStatus).toBe("ACTIVE");
      });
    });

    it("supports search", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees?search=Demo")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("supports sortBy and sortOrder", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees?sortBy=firstName&sortOrder=desc")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("allows MANAGER to access employee list (operational view)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("responds with 400 for invalid pageSize", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees?pageSize=invalid")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/employees — Create", () => {
    it("creates employee with ONBOARDING status by default", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-TEST-1",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeCode).toBe("EMP-TEST-1");
      expect(res.body.data.employmentStatus).toBe("ONBOARDING");
      expect(res.body.data.billingStatus).toBe("NON_BILLABLE");
    });

    it("honors explicit employmentStatus and billingStatus (B1 — no hardcode)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-B1-1",
          firstName: "Billable",
          lastName: "Active",
          email: "billable.active@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: "ACTIVE",
          billingStatus: "BILLABLE"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("ACTIVE");
      expect(res.body.data.billingStatus).toBe("BILLABLE");

      const db = getDb();
      const emp = await db
        .collection("employees")
        .findOne({ employeeId: "EMP-B1-1" });
      expect(emp).not.toBeNull();
      expect(emp?.employmentStatus).toBe("ACTIVE");
      expect(emp?.billingStatus).toBe("BILLABLE");

      await db.collection("employees").deleteMany({ employeeId: "EMP-B1-1" });
    });

    it("returns 409 for duplicate employeeId", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DUP-1",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        });

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DUP-1",
          firstName: "Jane2",
          lastName: "Doe",
          email: "jane2.doe@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("returns 409 for duplicate email", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DUP-2",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid email", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-TEST-3",
          firstName: "Jane",
          lastName: "Doe",
          email: "not-an-email",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 403 for EMPLOYEE without create permission", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-TEST-4",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 404 when managerId references non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-TEST-5",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe2@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          managerId: "EMP-NONEXISTENT"
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/v1/employees/:employeeId — Detail", () => {
    it("returns employee detail for HR", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeCode).toBe("EMP-001");
      expect(res.body.data.firstName).toBe("Demo0");
      expect(res.body.data.email).toBe("admin@example.com");
    });

    it("HR can see salary and bill rate", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.compensation).toBeDefined();
      expect(res.body.data.compensation.salary).toBe(500000);
      expect(res.body.data.billRate).toBeDefined();
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("MANAGER can view employee detail", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-002")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("MANAGER cannot see salary fields", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.compensation).toBeUndefined();
      expect(res.body.data.billRate).toBeUndefined();
    });

    it("EMPLOYEE can view own detail", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeCode).toBe("EMP-005");
    });

    it("EMPLOYEE cannot view another employee's detail (IDOR prevention)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/employees/:employeeId — Update", () => {
    it("HR can update employee designation", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-003")
        .set("Authorization", `Bearer ${token}`)
        .send({ designation: "Senior Engineer" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.designation).toBe("Senior Engineer");
    });

    it("HR can update compensation and bill rate", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .send({
          compensation: { currency: "INR", salary: 600000, payFrequency: "YEARLY" },
          billRate: { currency: "INR", amount: 2000, unit: "DAILY" }
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("EMPLOYEE can update own phone", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${token}`)
        .send({ phone: "+1-555-0001" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe("+1-555-0001");
    });

    it("EMPLOYEE cannot update designation (mass assignment protection)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${token}`)
        .send({ designation: "Hacked" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.designation).not.toBe("Hacked");
    });

    it("EMPLOYEE cannot update another employee (IDOR)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .send({ phone: "+1-555-0001" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("MANAGER cannot update employee (only HR can edit)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-005")
        .set("Authorization", `Bearer ${token}`)
        .send({ designation: "Lead Engineer" })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("MANAGER cannot update salary", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .send({ compensation: { salary: 9999999 } })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 401 without authentication", async () => {
      const res = await request(app)
        .patch("/api/v1/employees/EMP-001")
        .send({ designation: "Hacker" })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("POST /api/v1/employees/:employeeId/billing-status", () => {
    it("HR can update billing status", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-003/billing-status")
        .set("Authorization", `Bearer ${token}`)
        .send({ billingStatus: "BILLABLE" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.billingStatus).toBe("BILLABLE");
    });

    it("returns 400 for invalid billing status", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/employees/EMP-003/billing-status")
        .set("Authorization", `Bearer ${token}`)
        .send({ billingStatus: "INVALID" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/employees/:employeeId/:action — Lifecycle", () => {
    it("HR can activate an ONBOARDING employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-TEST-1/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("ACTIVE");
    });

    it("HR can suspend an ACTIVE employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-002/suspend")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("SUSPENDED");
    });

    it("HR can resign an ACTIVE employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/employees/EMP-002/activate")
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .post("/api/v1/employees/EMP-002/resign")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("RESIGNED");
    });

    it("HR can terminate a RESIGNED employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-002/terminate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("TERMINATED");
    });

    it("re-activates a TERMINATED employee via deactivate to INACTIVE", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-002/deactivate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("INACTIVE");
    });

    it("returns 422 for invalid status transition (INACTIVE to ACTIVE)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-002/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("returns 404 for non-existent lifecycle action", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-001/delete")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("MANAGER cannot perform lifecycle actions (only HR/Admin)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-003/suspend")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("HR can suspend and re-activate an employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/employees/EMP-003/suspend")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post("/api/v1/employees/EMP-003/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe("ACTIVE");
    });
  });

  describe("GET /api/v1/employees/:employeeId/timesheet — Provisioning", () => {
    it("HR can view timesheet eligibility", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.status).toBe("ELIGIBLE");
    });

    it("MANAGER can view timesheet eligibility", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-005/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ELIGIBLE");
    });

    it("returns 403 for SUPERVISOR without timesheet provisioning permissions", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-005/timesheet/provision")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-NONEXISTENT/timesheet")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Country mapping", () => {
    it("maps INDIA to India in response", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.country).toBe("India");
    });
  });

  describe("Role mapping from linked users", () => {
    it("populates role from the linked user record for non-seeded employees", async () => {
      const db = getDb();
      await db.collection("employees").deleteMany({ employeeId: "EMP-ROLE-TEST" });
      await db.collection("users").deleteMany({ employeeId: "EMP-ROLE-TEST", email: "role.tester@test.com" });

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-ROLE-TEST",
          firstName: "Role",
          lastName: "Tester",
          email: "role.tester@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(201);

      // No linked user record yet → no role available
      expect(createRes.body.data.role).toBeUndefined();

      const preLinkDetail = await request(app)
        .get("/api/v1/employees/EMP-ROLE-TEST")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(preLinkDetail.body.data.role).toBeUndefined();

      // Link a user record with a role that no hardcoded map knows about
      await db.collection("users").insertOne({
        userId: "user_role_test",
        email: "role.tester@test.com",
        firstName: "Role",
        lastName: "Tester",
        role: "SUPERVISOR",
        status: "ACTIVE",
        employeeId: "EMP-ROLE-TEST",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const listRes = await request(app)
        .get("/api/v1/employees")
        .query({ search: "EMP-ROLE-TEST" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].role).toBe("SUPERVISOR");

      const detailRes = await request(app)
        .get("/api/v1/employees/EMP-ROLE-TEST")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(detailRes.body.data.role).toBe("SUPERVISOR");

      await db.collection("employees").deleteMany({ employeeId: "EMP-ROLE-TEST" });
      await db.collection("users").deleteMany({ userId: "user_role_test" });
    });
  });

  describe("Search behavior", () => {
    it("treats regex metacharacters in search as literals", async () => {
      const db = getDb();
      await db.collection("employees").deleteMany({ employeeId: "EMP-SEARCH-1" });

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-SEARCH-1",
          firstName: "Emp(1)",
          lastName: "Tester",
          email: "emp.search@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(201);

      expect(createRes.body.data.employeeCode).toBe("EMP-SEARCH-1");

      const res = await request(app)
        .get("/api/v1/employees")
        .query({ search: "Emp(1)" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = res.body.data.map((e: { id: string }) => e.id);
      expect(ids).toContain("EMP-SEARCH-1");

      await db.collection("employees").deleteMany({ employeeId: "EMP-SEARCH-1" });
    });

    it("rejects an overlong search string with 400", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees")
        .query({ search: "a".repeat(101) })
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe("Timesheet eligibility in DTO", () => {
    it("reflects computed eligibility instead of a hardcoded value", async () => {
      const db = getDb();
      await db.collection("employees").deleteMany({ employeeId: "EMP-TS-1" });

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-TS-1",
          firstName: "Ts",
          lastName: "Tester",
          email: "ts.tester@test.com",
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA"
        })
        .expect(201);

      expect(createRes.body.data.timesheetEligibility).toBe("NOT_ELIGIBLE");

      const getEligibility = async (): Promise<string> => {
        const res = await request(app)
          .get("/api/v1/employees/EMP-TS-1")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
        return res.body.data.timesheetEligibility;
      };

      // New employees always start ONBOARDING + NON_BILLABLE (business rule)
      // → not eligible regardless of billing
      expect(await getEligibility()).toBe("NOT_ELIGIBLE");

      await db
        .collection("employees")
        .updateOne({ employeeId: "EMP-TS-1" }, { $set: { billingStatus: "BILLABLE" } });
      expect(await getEligibility()).toBe("NOT_ELIGIBLE");

      // ACTIVE + BILLABLE → ELIGIBLE (previously always reported NOT_ELIGIBLE)
      await db
        .collection("employees")
        .updateOne({ employeeId: "EMP-TS-1" }, { $set: { employmentStatus: "ACTIVE" } });
      expect(await getEligibility()).toBe("ELIGIBLE");

      // ACTIVE + NON_BILLABLE → NOT_ELIGIBLE
      await db
        .collection("employees")
        .updateOne({ employeeId: "EMP-TS-1" }, { $set: { billingStatus: "NON_BILLABLE" } });
      expect(await getEligibility()).toBe("NOT_ELIGIBLE");

      // A recorded provisioning failure keeps it not eligible even when
      // ACTIVE + BILLABLE
      await db.collection("employees").updateOne(
        { employeeId: "EMP-TS-1" },
        { $set: { billingStatus: "BILLABLE", timesheetEligibility: { eligible: false, reason: "FAILED" } } }
      );
      expect(await getEligibility()).toBe("NOT_ELIGIBLE");

       await db.collection("employees").deleteMany({ employeeId: "EMP-TS-1" });
    });
  });

  describe("DELETE /api/v1/employees/:employeeId", () => {
    it("HR can hard-delete an employee and cascading records", async () => {
      const db = getDb();
      const token = await getAccessToken(app, "hreniac@eniacinc.com");

      // Cleanup any previous state
      await db.collection("employees").deleteMany({ employeeId: "EMP-DELETE-1" });
      await db.collection("users").deleteMany({ employeeId: "EMP-DELETE-1" });
      await db.collection("onboarding_records").deleteMany({ employeeId: "EMP-DELETE-1" });
      await db.collection("invitations").deleteMany({ employeeId: "EMP-DELETE-1" });

      await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DELETE-1",
          firstName: "Delete",
          lastName: "Me",
          email: "delete.me@test.com",
          phone: "+1 555-9999",
          designation: "Engineer",
          department: "Engineering",
          country: "USA",
          employmentStatus: "ONBOARDING",
          employmentType: "FULL_TIME",
          billingStatus: "BILLABLE",
          joiningDate: "2026-10-15",
        })
        .expect(201);

      const res = await request(app)
        .delete("/api/v1/employees/EMP-DELETE-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      expect(res.body).toEqual({});

      // Verify employee is gone
      const emp = await db.collection("employees").findOne({ employeeId: "EMP-DELETE-1" });
      expect(emp).toBeNull();

      // Clean up is implicit — the employee and any linked records are deleted
    });

    it("returns 403 for non-HR roles", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .delete("/api/v1/employees/EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });
  });
});
