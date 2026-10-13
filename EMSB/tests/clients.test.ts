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

  await clients.deleteMany({});
  await projects.deleteMany({});

  // Seed clients
  for (let i = 0; i < 5; i++) {
    await clients.updateOne(
      { clientId: `CLT-${String(i + 1).padStart(3, "0")}` },
      {
        $set: {
          clientId: `CLT-${String(i + 1).padStart(3, "0")}`,
          name: `Client_${i + 1}`,
          code: `CLT${String(i + 1).padStart(3, "0")}`,
          status: i < 2 ? "PROSPECT" : "ACTIVE",
          industry: ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail"][i],
          contact: {
            name: `Contact_${i + 1}`,
            email: `contact${i + 1}@example.com`,
            phone: `+1-555-${String(200 + i).padStart(4, "0")}`
          },
          address: {
            line1: `${100 + i} Ave`,
            city: i % 2 === 0 ? "Bangalore" : "New York",
            state: i % 2 === 0 ? "Karnataka" : "NY",
            country: i % 2 === 0 ? "India" : "United States",
            postalCode: i % 2 === 0 ? "560001" : "10001"
          },
          createdBy: "ADMIN",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  // Seed a couple projects so activeProjectCount is non-zero for CLT-003
  for (let i = 0; i < 4; i++) {
    await projects.updateOne(
      { projectId: `PRO-CLT-${i + 1}` },
      {
        $set: {
          projectId: `PRO-CLT-${i + 1}`,
          clientId: "CLT-003",
          name: `Project_${i + 1}`,
          code: `PRJC${i + 1}`,
          status: i < 2 ? "ACTIVE" : "COMPLETED",
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

describe("Phase 8 — Clients", () => {
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
    await db.collection("clients").deleteMany({ clientId: /^CLT-TEST/ });
  });

  describe("GET /api/v1/clients — List", () => {
    it("MANAGER can list clients", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("ADMIN can list clients", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("EMPLOYEE cannot list clients (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("supports status filter", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients?status=ACTIVE")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((c: { status: string }) => {
        expect(c.status).toBe("ACTIVE");
      });
    });

    it("DTO includes activeProjectCount", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((c: { activeProjectCount: number }) => {
        expect(typeof c.activeProjectCount).toBe("number");
      });
    });
  });

  describe("POST /api/v1/clients — Create", () => {
    it("MANAGER can create a client", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Test Client A",
          code: "CLT-TEST-A",
          status: "PROSPECT",
          industry: "Technology",
          contact: { name: "Jane", email: "jane@test.com", phone: "+1-555-1234" },
          address: { country: "India", city: "Pune" }
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Test Client A");
      expect(res.body.data.clientCode).toBe("CLT-TEST-A");
    });

    it("returns 409 for duplicate client code", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Dup Client", code: "CLT-TEST-DUP" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Dup Client 2", code: "CLT-TEST-DUP" })
        .expect(409);

      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("EMPLOYEE cannot create clients (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Blocked Client" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("SUPERVISOR cannot create clients (403)", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Supervisor Client" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("validates name is required (400)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ code: "CLT-TEST-NONAME" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/clients/:clientId — Detail", () => {
    it("MANAGER can get client detail", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients/CLT-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clientId).toBe("CLT-001");
      expect(res.body.data.primaryContact).toBeDefined();
    });

    it("returns 404 for non-existent client", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients/CLT-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("EMPLOYEE cannot view client detail (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients/CLT-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("PATCH /api/v1/clients/:clientId — Update", () => {
    it("MANAGER can update a client", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/clients/CLT-001")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated Client Name", industry: "Consulting" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Client Name");
    });

    it("EMPLOYEE cannot update clients (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/clients/CLT-001")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Hacked" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("POST /api/v1/clients/:clientId/deactivate", () => {
    it("MANAGER can deactivate a client", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients/CLT-004/deactivate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("INACTIVE");
    });

    it("EMPLOYEE cannot deactivate clients (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/clients/CLT-005/deactivate")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for client actions", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      await request(app)
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Audit Client", code: "CLT-TEST-AUDIT" })
        .expect(201);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "client" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "client.created")).toBe(true);
    });
  });

  describe("Search behavior", () => {
    it("treats regex metacharacters in search as literals", async () => {
      const db = getDb();
      await db.collection("clients").insertOne({
        clientId: "CLT-TEST-900",
        name: "C++ Consulting",
        code: "CLTTEST900",
        status: "ACTIVE",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .query({ search: "C++" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain("CLT-TEST-900");
    });

    it("does not expand wildcard patterns in search", async () => {
      const db = getDb();
      await db.collection("clients").insertOne({
        clientId: "CLT-TEST-901",
        name: "Wildcard Corp",
        code: "CLTTEST901",
        status: "ACTIVE",
        createdBy: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .query({ search: ".*" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).not.toContain("CLT-TEST-901");
    });

    it("rejects an overlong search string with 400", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/clients")
        .query({ search: "a".repeat(101) })
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
