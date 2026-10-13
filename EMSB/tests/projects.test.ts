import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { Response } from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const clients = db.collection("clients");
  const projects = db.collection("projects");
  const employees = db.collection("employees");

  await clients.deleteMany({});
  await projects.deleteMany({});
  await employees.deleteMany({});

  // Seed clients
  for (let i = 0; i < 3; i++) {
    await clients.updateOne(
      { clientId: `CLT-${String(i + 1).padStart(3, "0")}` },
      {
        $set: {
          clientId: `CLT-${String(i + 1).padStart(3, "0")}`,
          name: `Client_${i + 1}`,
          code: `CLT${String(i + 1).padStart(3, "0")}`,
          status: "ACTIVE",
          industry: "Technology",
          contact: { name: `C${i}`, email: `c${i}@test.com`, phone: "+1-555-0000" },
          address: { country: "India", city: "Pune" },
          createdBy: "ADMIN",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  // Seed manager employee
  await employees.updateOne(
    { employeeId: "EMP-003" },
    {
      $set: {
        employeeId: "EMP-003",
        firstName: "Manager",
        lastName: "User",
        email: "mgr@test.com",
        designation: "Project Manager",
        department: "Operations",
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

async function createProject(
  app: Express,
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<Response> {
  const res = await request(app)
    .post("/api/v1/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({
      clientId: "CLT-001",
      name: "Test Project",
      status: "PLANNING",
      managerId: "EMP-003",
      ...overrides
    });
  return res;
}

describe("Phase 9 — Projects", () => {
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
    await db.collection("projects").deleteMany({ name: /^Test|^Phase9/ });
  });

  describe("GET /api/v1/projects — List", () => {
    it("MANAGER can list projects", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own assigned projects (200, filtered)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // EMP-005 has no assignments in this test, so list should be empty
      expect(res.body.data.length).toBe(0);
    });

    it("supports status filter", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await createProject(app, token, { name: "Phase9-A", status: "PLANNING" });

      const res = await request(app)
        .get("/api/v1/projects?status=PLANNING")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((p: { status: string }) => {
        expect(p.status).toBe("PLANNING");
      });
    });

    it("DTO includes teamSize and progress", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((p: { teamSize: number; progress: number }) => {
        expect(typeof p.teamSize).toBe("number");
        expect(typeof p.progress).toBe("number");
      });
    });
  });

  describe("POST /api/v1/projects — Create", () => {
    it("MANAGER can create a project", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({
          clientId: "CLT-001",
          name: "Phase9 Create",
          code: "PRJ-P9-1",
          description: "A new project",
          managerId: "EMP-003"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Phase9 Create");
      expect(res.body.data.status).toBe("PLANNING");
      expect(res.body.data.projectCode).toBe("PRJ-P9-1");
    });

    it("returns 404 if client does not exist", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({ clientId: "CLT-NONEXISTENT", name: "No Client" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 409 for duplicate project code", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await createProject(app, token, { name: "Phase9-Dup1", code: "PRJ-DUP" });

      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({ clientId: "CLT-001", name: "Phase9-Dup2", code: "PRJ-DUP" })
        .expect(409);

      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("EMPLOYEE cannot create projects (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({ clientId: "CLT-001", name: "Blocked" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("validates start date <= end date (400)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({
          clientId: "CLT-001",
          name: "Bad Dates",
          startDate: "2030-06-01",
          endDate: "2030-01-01"
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/projects/:projectId — Detail", () => {
    it("MANAGER can get project detail", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Detail", code: "PRJ-DET" });
      const projectId = createRes.body.data.projectId as string;

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.projectId).toBe(projectId);
    });

    it("returns 404 for non-existent project", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/projects/PRO-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/projects/:projectId — Update", () => {
    it("MANAGER can update a project", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Update", code: "PRJ-UPD" });
      const projectId = createRes.body.data.projectId as string;

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ progressPercent: 50, health: "AT_RISK" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.progress).toBe(50);
      expect(res.body.data.health).toBe("AT_RISK");
    });
  });

  describe("Project status transitions", () => {
    it("PLANNING → ACTIVE via activate", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Activate", code: "PRJ-ACT", status: "PLANNING" });
      const projectId = createRes.body.data.projectId as string;

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("ACTIVE → COMPLETED via complete (sets progress 100)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Complete", code: "PRJ-CMP", status: "PLANNING" });
      const projectId = createRes.body.data.projectId as string;

      await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.progress).toBe(100);
    });

    it("COMPLETED → CANCELLED via archive", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Archive", code: "PRJ-ARC", status: "PLANNING" });
      const projectId = createRes.body.data.projectId as string;

      await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post(`/api/v1/projects/${projectId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("rejects invalid transition COMPLETED → ACTIVE (422)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-Invalid", code: "PRJ-INV", status: "PLANNING" });
      const projectId = createRes.body.data.projectId as string;

      await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post(`/api/v1/projects/${projectId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_PROJECT_TRANSITION");
    });

    it("EMPLOYEE cannot activate projects (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const createRes = await createProject(app, token, { name: "Phase9-EmpActivate", code: "PRJ-EACT", status: "PLANNING" });
      const projectId = createRes.body.data.projectId as string;

      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/activate`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for project actions", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await createProject(app, token, { name: "Phase9-Audit", code: "PRJ-AUD" });

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "project" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "project.created")).toBe(true);
    });
  });
});
