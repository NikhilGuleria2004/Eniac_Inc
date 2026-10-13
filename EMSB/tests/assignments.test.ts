import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const clients = db.collection("clients");
  const projects = db.collection("projects");
  const employees = db.collection("employees");
  const assignments = db.collection("project_assignments");

  await clients.deleteMany({});
  await projects.deleteMany({});
  await employees.deleteMany({});
  await assignments.deleteMany({});

  // Client
  await clients.updateOne(
    { clientId: "CLT-001" },
    {
      $set: {
        clientId: "CLT-001",
        name: "Client 1",
        code: "CLT001",
        status: "ACTIVE",
        industry: "Technology",
        contact: { name: "C1", email: "c1@test.com", phone: "+1-555-0000" },
        address: { country: "India", city: "Pune" },
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  // Projects
  for (let i = 0; i < 3; i++) {
    await projects.updateOne(
      { projectId: `PRO-${String(i + 1).padStart(3, "0")}` },
      {
        $set: {
          projectId: `PRO-${String(i + 1).padStart(3, "0")}`,
          clientId: "CLT-001",
          name: `Project_${i + 1}`,
          code: `PRJ${i + 1}`,
          status: "ACTIVE",
          health: "ON_TRACK",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          managerId: "EMP-003",
          progressPercent: 50,
          createdBy: "ADMIN",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  // Employees
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

describe("Phase 10 — Assignments", () => {
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
    await db.collection("project_assignments").deleteMany({});
  });

  describe("POST /api/v1/assignments — Create", () => {
    it("MANAGER can create an assignment", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-001",
          role: "Developer",
          allocationPercent: 60,
          billable: true,
          startDate: "2024-03-01"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.projectId).toBe("PRO-001");
      expect(res.body.data.allocation).toBe(60);
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("returns 404 if employee does not exist", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-NONEXISTENT",
          projectId: "PRO-001",
          allocationPercent: 50,
          startDate: "2024-03-01"
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 if project does not exist", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-NONEXISTENT",
          allocationPercent: 50,
          startDate: "2024-03-01"
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rejects allocationPercent > 100 (400)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-001",
          allocationPercent: 150,
          startDate: "2024-03-01"
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects negative allocationPercent (400)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-001",
          allocationPercent: -10,
          startDate: "2024-03-01"
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("detects overallocation (warning, still creates)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 70, startDate: "2024-03-01" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-002", allocationPercent: 60, startDate: "2024-03-01" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overallocationWarning).toBeDefined();
      expect(res.body.data.overallocationWarning).toContain("130");
    });

    it("EMPLOYEE cannot create assignments (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-001",
          allocationPercent: 50,
          startDate: "2024-03-01"
        })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("SUPERVISOR can create assignments", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          projectId: "PRO-003",
          allocationPercent: 40,
          startDate: "2024-03-01"
        })
        .expect(201);

      expect(res.body.data.status).toBe("ACTIVE");
    });
  });

  describe("GET /api/v1/assignments — List", () => {
    it("MANAGER can list all assignments", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const res = await request(app)
        .get("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own assignments", async () => {
      const mgrToken = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${mgrToken}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${mgrToken}`)
        .send({ employeeId: "EMP-001", projectId: "PRO-002", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/assignments")
        .set("Authorization", `Bearer ${empToken}`)
        .expect(200);

      res.body.data.forEach((a: { employeeId: string }) => {
        expect(a.employeeId).toBe("EMP-005");
      });
    });

    it("supports projectId filter", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/assignments?projectId=PRO-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((a: { projectId: string }) => {
        expect(a.projectId).toBe("PRO-001");
      });
    });
  });

  describe("GET /api/v1/assignments/:assignmentId — Detail", () => {
    it("MANAGER can get assignment detail", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const assignmentId = createRes.body.data.assignmentId;

      const res = await request(app)
        .get(`/api/v1/assignments/${assignmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.assignmentId).toBe(assignmentId);
    });

    it("EMPLOYEE cannot view another employee's assignment (IDOR)", async () => {
      const mgrToken = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${mgrToken}`)
        .send({ employeeId: "EMP-001", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const assignmentId = createRes.body.data.assignmentId;
      const empToken = await getAccessToken(app, "employee@eniacinc.com");

      const res = await request(app)
        .get(`/api/v1/assignments/${assignmentId}`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for non-existent assignment", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/assignments/ASN-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/assignments/:assignmentId — Update", () => {
    it("MANAGER can update allocation", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const assignmentId = createRes.body.data.assignmentId;

      const res = await request(app)
        .patch(`/api/v1/assignments/${assignmentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ allocationPercent: 80, billable: false })
        .expect(200);

      expect(res.body.data.allocation).toBe(80);
      expect(res.body.data.billable).toBe(false);
    });
  });

  describe("POST /api/v1/assignments/:assignmentId/end", () => {
    it("MANAGER can end an assignment", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const assignmentId = createRes.body.data.assignmentId;

      const res = await request(app)
        .post(`/api/v1/assignments/${assignmentId}/end`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("ENDED");
    });

    it("prevents ending an already-ended assignment (422)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const assignmentId = createRes.body.data.assignmentId;

      await request(app)
        .post(`/api/v1/assignments/${assignmentId}/end`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/assignments/${assignmentId}/end`)
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("ASSIGNMENT_ALREADY_ENDED");
    });
  });

  describe("GET /api/v1/assignments/employee/:employeeId/allocation", () => {
    it("returns allocation summary for employee", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 30, startDate: "2024-03-01" })
        .expect(201);

      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-002", allocationPercent: 40, startDate: "2024-03-01" })
        .expect(201);

      const res = await request(app)
        .get("/api/v1/assignments/employee/EMP-005/allocation")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.totalAllocationPercent).toBe(70);
      expect(res.body.data.overallocated).toBe(false);
    });

    it("EMPLOYEE can view own allocation", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/assignments/employee/EMP-005/allocation")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.employeeId).toBe("EMP-005");
    });

    it("EMPLOYEE cannot view another's allocation (IDOR)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/assignments/employee/EMP-001/allocation")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for assignment actions", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/assignments")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", projectId: "PRO-001", allocationPercent: 50, startDate: "2024-03-01" })
        .expect(201);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "assignment" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "assignment.created")).toBe(true);
    });
  });
});
