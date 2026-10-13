import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");
  const documents = db.collection("documents");

  await employees.deleteMany({});
  await documents.deleteMany({});

  const testEmployees = [
    {
      employeeId: "EMP-DOC-1",
      firstName: "Doc",
      lastName: "Owner",
      email: "doc.owner@test.com",
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
      employeeId: "EMP-DOC-2",
      firstName: "Second",
      lastName: "Employee",
      email: "second.emp@test.com",
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

async function createDocument(
  app: Express,
  token: string,
  data: { employeeId: string; type: string; name: string; fileUrl?: string }
): Promise<string> {
  const res = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${token}`)
    .send(data);
  return res.body.data.documentId;
}

describe("Phase 5 — Documents", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/v1/documents — Create/Upload", () => {
    it("HR can upload a document for an employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DOC-1",
          type: "RESUME",
          name: "resume.pdf",
          fileUrl: "https://storage.example.com/resume.pdf"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentId).toBeDefined();
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.type).toBe("RESUME");
    });

    it("returns 404 if employee does not exist", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-NONEXISTENT",
          type: "RESUME",
          name: "resume.pdf"
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("EMPLOYEE can upload own document", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          type: "ID_PROOF",
          name: "id_proof.pdf"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("EMPLOYEE cannot upload document for another employee", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DOC-2",
          type: "ID_PROOF",
          name: "id_proof.pdf"
        })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("MANAGER cannot upload documents", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-DOC-1",
          type: "RESUME",
          name: "resume.pdf"
        })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("GET /api/v1/documents — List", () => {
    it("HR can list all documents", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own documents", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((doc: { employeeId: string }) => {
        expect(doc.employeeId).toBe("EMP-005");
      });
    });

    it("MANAGER cannot access documents list", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("supports status filter", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents?status=PENDING")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((doc: { status: string }) => {
        expect(doc.status).toBe("PENDING");
      });
    });

    it("supports type filter", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents?type=RESUME")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((doc: { type: string }) => {
        expect(doc.type).toBe("RESUME");
      });
    });
  });

  describe("GET /api/v1/documents/:documentId — Detail", () => {
    it("HR can get document detail", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "detail_test.pdf"
      });

      const res = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentId).toBe(docId);
    });

    it("EMPLOYEE can view own document", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-005",
        type: "CERTIFICATE",
        name: "cert.pdf"
      });

      const res = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
    });

    it("EMPLOYEE cannot view another employee's document (IDOR)", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, hrToken, {
        employeeId: "EMP-DOC-2",
        type: "RESUME",
        name: "other_resume.pdf"
      });

      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("MANAGER cannot view documents", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, hrToken, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "manager_test.pdf"
      });

      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get(`/api/v1/documents/${docId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("returns 404 for non-existent document", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents/DOC-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/v1/documents/:documentId/approve", () => {
    it("HR can approve a PENDING document", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "approve_test.pdf"
      });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Looks good" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVED");
      expect(res.body.data.reviewedBy).toBe("HR");
    });

    it("prevents re-approving an already approved document", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "reapprove_test.pdf"
      });

      await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Approved" });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Approve again" })
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_DOCUMENT_TRANSITION");
    });

    it("EMPLOYEE cannot approve documents", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, hrToken, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "emp_approve_test.pdf"
      });

      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Self approve" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("requires comments", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "no_comment_test.pdf"
      });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/documents/:documentId/reject", () => {
    it("HR can reject a PENDING document", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "reject_test.pdf"
      });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/reject`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Document is not valid" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("REJECTED");
    });

    it("REJECTED document can be re-approved", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "reject_then_approve.pdf"
      });

      await request(app)
        .post(`/api/v1/documents/${docId}/reject`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Rejected first" });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Now approved" })
        .expect(200);

      expect(res.body.data.status).toBe("APPROVED");
    });
  });

  describe("POST /api/v1/documents/:documentId/request-changes", () => {
    it("HR can request changes on a PENDING document", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "changes_test.pdf"
      });

      const res = await request(app)
        .post(`/api/v1/documents/${docId}/request-changes`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Please update the address" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("CHANGES_REQUESTED");
    });
  });

  describe("Document Expiry", () => {
    it("HR can query expiring documents", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents/expiring-soon")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("HR can query expired documents", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents/expired")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("MANAGER can access expiry reports", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents/expired")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("EMPLOYEE cannot access expiry reports", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/documents/expired")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for document actions", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const docId = await createDocument(app, token, {
        employeeId: "EMP-DOC-1",
        type: "RESUME",
        name: "audit_test.pdf"
      });

      await request(app)
        .post(`/api/v1/documents/${docId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comments: "Approved for audit test" });

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "document", entityId: docId })
        .toArray();

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l) => l.action === "document.uploaded")).toBe(true);
      expect(logs.some((l) => l.action === "document.approved")).toBe(true);
    });
  });
});
