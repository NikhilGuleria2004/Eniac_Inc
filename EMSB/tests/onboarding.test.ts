import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { registerEventListeners } from "../src/integrations/event-listeners.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");
  const onboarding = db.collection("onboarding_records");

  await employees.deleteMany({});
  await onboarding.deleteMany({});

  // Create test employees
  const testEmployees = [
    {
      employeeId: "EMP-ONB-1",
      firstName: "Test",
      lastName: "Employee",
      email: "test.onb1@test.com",
      phone: "+1-555-0001",
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ONBOARDING",
      billingStatus: "BILLABLE",
      joiningDate: new Date("2024-01-01"),
      employmentType: "FULL_TIME",
      address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-ONB-2",
      firstName: "Onboarding",
      lastName: "Employee",
      email: "test.onb2@test.com",
      phone: "+1-555-0002",
      designation: "Designer",
      department: "Design",
      country: "USA",
      employmentStatus: "ONBOARDING",
      billingStatus: "BILLABLE",
      joiningDate: new Date("2024-02-01"),
      employmentType: "FULL_TIME",
      address: { line1: "456 St", city: "New York", state: "NY", country: "USA" },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-ONB-3",
      firstName: "Rejected",
      lastName: "Employee",
      email: "test.onb3@test.com",
      phone: "+1-555-0003",
      designation: "Analyst",
      department: "Operations",
      country: "INDIA",
      employmentStatus: "ONBOARDING",
      billingStatus: "NON_BILLABLE",
      joiningDate: new Date("2024-03-01"),
      employmentType: "FULL_TIME",
      address: { line1: "789 St", city: "Delhi", state: "Delhi", country: "INDIA" },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const emp of testEmployees) {
    await employees.updateOne({ employeeId: emp.employeeId }, { $set: emp }, { upsert: true });
  }

  // C2: Create APPROVED documents of each required type for all test employees
  // so that validateOnboardingCompletion can pass during the submit→review→approve flow.
  const documents = db.collection("documents");
  await documents.deleteMany({ employeeId: { $in: ["EMP-ONB-1", "EMP-ONB-2", "EMP-ONB-3"] } });

  const requiredDocTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF"];
  for (const emp of testEmployees) {
    for (const type of requiredDocTypes) {
      await documents.insertOne({
        documentId: `DOC-${emp.employeeId}-${type}`,
        employeeId: emp.employeeId,
        type,
        name: `${type.replace(/_/g, " ")} for ${emp.firstName}`,
        status: "APPROVED",
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
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

describe("Phase 4 — Onboarding", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    registerEventListeners();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/v1/onboarding — Create", () => {
    it("HR can create an onboarding record", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-1" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-ONB-1");
      expect(res.body.data.currentStage).toBe("EMPLOYEE_INFORMATION");
      expect(res.body.data.status).toBe("DRAFT");
    });

    it("returns 404 if employee does not exist", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-NONEXISTENT" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 422 if onboarding already exists for employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-2" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-2" })
        .expect(422);

      expect(res.body.error.code).toBe("ONBOARDING_EXISTS");
    });

    it("returns 403 for EMPLOYEE trying to create onboarding", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-3" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("GET /api/v1/onboarding — List", () => {
    it("HR can list onboarding records", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("returns 403 for non-HR/non-Admin roles", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("ADMIN can list onboarding records", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/onboarding/:employeeId — Detail", () => {
    it("HR can get onboarding detail", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding/EMP-ONB-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-ONB-1");
      expect(res.body.data.currentStage).toBe("EMPLOYEE_INFORMATION");
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding/EMP-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/v1/onboarding/:employeeId/submit", () => {
    it("HR can submit an onboarding record", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("AWAITING_REVIEW");
    });

    it("prevents submission after already submitted", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/submit")
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_ONBOARDING_ACTION");
    });

    it("prevents approval without submission (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_ONBOARDING_ACTION");
    });
  });

  describe("POST /api/v1/onboarding/:employeeId/review", () => {
    it("HR can review an awaiting-submission onboarding", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/submit")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res2 = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "All documents look good" })
        .expect(200);

      expect(res2.body.success).toBe(true);
      expect(res2.body.data.status).toBe("REVIEWED");
      expect(res2.body.data.reviewNotes).toBe("All documents look good");
    });

    it("prevents review without prior submission", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-3" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Reviewed" })
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_ONBOARDING_ACTION");
    });
  });

  describe("POST /api/v1/onboarding/:employeeId/reject", () => {
    it("HR can reject an awaiting-review onboarding", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/submit")
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/reject")
        .set("Authorization", `Bearer ${token}`)
        .send({ rejectionReason: "Missing required documents" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("REJECTED");
      expect(res.body.data.rejectionReason).toBe("Missing required documents");
    });
  });

  describe("POST /api/v1/onboarding/:employeeId/approve", () => {
    it("HR can approve a reviewed onboarding", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/submit")
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Re-reviewed" });

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-3/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.currentStage).toBe("ACTIVATION");

      // Phase A (A2): approval does NOT activate the employee — activation is
      // a separate step. EMP-ONB-3 is still ONBOARDING here.
      const empRes = await request(app)
        .get("/api/v1/employees/EMP-ONB-3")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(empRes.body.data.employmentStatus).toBe("ONBOARDING");
    });

    it("prevents approval without completion of required fields", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/submit")
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Reviewed" });

      const db = getDb();
      await db.collection("employees").updateOne(
        { employeeId: "EMP-ONB-1" },
        { $set: { designation: "", department: "", country: "", address: {} } }
      );

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("ONBOARDING_INCOMPLETE");
    });
  });

  describe("POST /api/v1/onboarding/:employeeId/activate", () => {
    it("HR can activate a completed onboarding", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/submit")
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Reviewed" });
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/approve")
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-2/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStage).toBe("TIMESHEET_ELIGIBILITY");
      expect(res.body.data.activatedAt).toBeDefined();

      // Phase A — onboarding activation hands off to the timesheet platform:
      // a BILLABLE employee gets a timesheet_provisioning record marked ELIGIBLE
      // (proving the employeeActivated/employeeTimesheetEligibilityChanged path
      // fires from onboarding, not just the employee-lifecycle activate endpoint).
      const db = getDb();
      const provisioning = await db
        .collection("timesheet_provisioning")
        .findOne({ employeeId: "EMP-ONB-2" });
      expect(provisioning).not.toBeNull();
      expect(provisioning?.status).toBe("ELIGIBLE");
      expect(provisioning?.eligible).toBe(true);
    });

    it("activates the employee (employmentStatus → ACTIVE)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/employees/EMP-ONB-2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.employmentStatus).toBe("ACTIVE");
    });

    it("prevents activation before approval", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      // EMP-ONB-1 already has an onboarding record, just submit it
      await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/submit")
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_ONBOARDING_ACTION");
    });
  });

  describe("PATCH /api/v1/onboarding/:employeeId", () => {
    it("updates billingStatus on the employee (B2)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");

      const db = getDb();
      await db.collection("audit_logs").deleteMany({
        entityType: "employee",
        entityId: "EMP-ONB-2",
        action: "employee.billing_status_set"
      });

      const res = await request(app)
        .patch("/api/v1/onboarding/EMP-ONB-2")
        .set("Authorization", `Bearer ${token}`)
        .send({ billingStatus: "BILLABLE" })
        .expect(200);

      expect(res.body.success).toBe(true);

      const emp = await db
        .collection("employees")
        .findOne({ employeeId: "EMP-ONB-2" });
      expect(emp).not.toBeNull();
      expect(emp?.billingStatus).toBe("BILLABLE");

      const logs = await db
        .collection("audit_logs")
        .find({
          entityType: "employee",
          entityId: "EMP-ONB-2",
          action: "employee.billing_status_set"
        })
        .toArray();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 403 for non-HR roles", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/onboarding/EMP-ONB-2")
        .set("Authorization", `Bearer ${token}`)
        .send({ billingStatus: "BILLABLE" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Phase C — Stage gating + documents", () => {
    it("submit rejects when employee data is incomplete (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();

      // Create an employee missing EMPLOYEE_INFORMATION stage data
      // (current stage when submitting from DRAFT)
      await db.collection("employees").insertOne({
        employeeId: "EMP-C1-1",
        firstName: "",
        lastName: "",
        email: "",
        phone: "+1-555-0004",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        joiningDate: new Date("2024-01-01"),
        employmentType: "FULL_TIME",
        address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-C1-1" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-C1-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("ONBOARDING_INCOMPLETE");

      await db.collection("employees").deleteOne({ employeeId: "EMP-C1-1" });
      await db.collection("onboarding_records").deleteOne({ employeeId: "EMP-C1-1" });
    });

    it("submit populates completedStages and advances to HR_REVIEW", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();

      await db.collection("employees").insertOne({
        employeeId: "EMP-C2-1",
        firstName: "Stage",
        lastName: "Tester",
        email: "stage.tester@test.com",
        phone: "+1-555-0005",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        joiningDate: new Date("2024-01-01"),
        employmentType: "FULL_TIME",
        address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-C2-1" })
        .expect(201);

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-C2-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("AWAITING_REVIEW");
      expect(res.body.data.currentStage).toBe("HR_REVIEW");
      expect(res.body.data.completedStages).toContain("EMPLOYEE_INFORMATION");
      expect(res.body.data.completedStages).toContain("EMPLOYMENT_DETAILS");
      expect(res.body.data.completedStages).toContain("GEOGRAPHY");
      expect(res.body.data.completedStages).toContain("BILLING_CLASSIFICATION");

      await db.collection("employees").deleteOne({ employeeId: "EMP-C2-1" });
      await db.collection("onboarding_records").deleteOne({ employeeId: "EMP-C2-1" });
    });

    it("PATCH rejects out-of-order stage advancement (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();

      await db.collection("employees").insertOne({
        employeeId: "EMP-C3-1",
        firstName: "Stage",
        lastName: "Skipper",
        email: "skip.tester@test.com",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        joiningDate: new Date("2024-01-01"),
        employmentType: "FULL_TIME",
        address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-C3-1" })
        .expect(201);

      // EMP-C3-1 is at EMPLOYEE_INFORMATION; jumping to ACTIVATION is out of order
      const res = await request(app)
        .patch("/api/v1/onboarding/EMP-C3-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentStage: "ACTIVATION" })
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_ONBOARDING_ACTION");

      await db.collection("employees").deleteOne({ employeeId: "EMP-C3-1" });
      await db.collection("onboarding_records").deleteOne({ employeeId: "EMP-C3-1" });
    });

    it("approve blocked when required documents are missing (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const db = getDb();

      await db.collection("employees").insertOne({
        employeeId: "EMP-C4-1",
        firstName: "NoDocs",
        lastName: "Employee",
        email: "nodocs@test.com",
        designation: "Analyst",
        department: "Operations",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        joiningDate: new Date("2024-01-01"),
        employmentType: "FULL_TIME",
        address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create documents for EMP-C4-1, but DELETE them after submit so
      // validateOnboardingCompletion fails on the document check
      const docTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF"];
      for (const type of docTypes) {
        await db.collection("documents").insertOne({
          documentId: `DOC-C4-${type}`,
          employeeId: "EMP-C4-1",
          type,
          name: `${type.replace(/_/g, " ")}`,
          status: "APPROVED",
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-C4-1" })
        .expect(201);

      await request(app)
        .post("/api/v1/onboarding/EMP-C4-1/submit")
        .set("Authorization", `Bearer ${token}`);

      await request(app)
        .post("/api/v1/onboarding/EMP-C4-1/review")
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Reviewed" });

      // Remove the documents so approval should fail
      await db.collection("documents").deleteMany({ employeeId: "EMP-C4-1" });

      const res = await request(app)
        .post("/api/v1/onboarding/EMP-C4-1/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("ONBOARDING_INCOMPLETE");

      await db.collection("employees").deleteOne({ employeeId: "EMP-C4-1" });
      await db.collection("onboarding_records").deleteOne({ employeeId: "EMP-C4-1" });
    });
  });

  describe("A2 — approve does not activate employee", () => {
    const EMP_A2 = "EMP-A2-1";

    beforeAll(async () => {
      const db = getDb();
      await db.collection("documents").deleteMany({ employeeId: EMP_A2 });
      const docTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF"];
      for (const type of docTypes) {
        await db.collection("documents").insertOne({
          documentId: `DOC-A2-${type}`,
          employeeId: EMP_A2,
          type,
          name: `${type.replace(/_/g, " ")}`,
          status: "APPROVED",
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      await db.collection("employees").updateOne(
        { employeeId: EMP_A2 },
        {
          $set: {
            employeeId: EMP_A2,
            firstName: "Decoupled",
            lastName: "Approval",
            email: "decoupled.a2@test.com",
            phone: "+1-555-0010",
            designation: "Engineer",
            department: "Engineering",
            country: "INDIA",
            employmentStatus: "ONBOARDING",
            billingStatus: "BILLABLE",
            joiningDate: new Date("2024-01-01"),
            employmentType: "FULL_TIME",
            address: { line1: "123 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    });

    it("approve leaves employmentStatus as ONBOARDING", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");

      await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: EMP_A2 })
        .expect(201);

      await request(app)
        .post(`/api/v1/onboarding/${EMP_A2}/submit`)
        .set("Authorization", `Bearer ${token}`);

      await request(app)
        .post(`/api/v1/onboarding/${EMP_A2}/review`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reviewNotes: "Reviewed" });

      const res = await request(app)
        .post(`/api/v1/onboarding/${EMP_A2}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.currentStage).toBe("ACTIVATION");

      // Key assertion: approval does NOT activate. employmentStatus is still ONBOARDING.
      const empRes = await request(app)
        .get(`/api/v1/employees/${EMP_A2}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(empRes.body.data.employmentStatus).toBe("ONBOARDING");
    });

    afterAll(async () => {
      const db = getDb();
      await db.collection("employees").deleteOne({ employeeId: EMP_A2 });
      await db.collection("onboarding_records").deleteOne({ employeeId: EMP_A2 });
      await db.collection("documents").deleteMany({ employeeId: EMP_A2 });
    });
  });

  describe("Role-based access", () => {
    it("MANAGER cannot create onboarding (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ONB-3" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("MANAGER cannot approve onboarding (403)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-ONB-1/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("SUPERVISOR cannot access onboarding (403)", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding/EMP-ONB-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("D1: EMPLOYEE gets 403 (not 404) when viewing another employee's onboarding", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/onboarding/EMP-ONB-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });
});
