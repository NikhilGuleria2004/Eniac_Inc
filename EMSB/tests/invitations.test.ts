import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash, randomBytes } from "crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { InvitationRepository } from "../src/repositories/invitation.repository.js";
import { UserRepository } from "../src/repositories/user.repository.js";

const HR_EMAIL = "hreniac@eniacinc.com";
const NEW_PASSWORD = "Welcome123";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function setupInvitationData() {
  const db = getDb();

  await db.collection("invitations").deleteMany({});
  await db.collection("onboarding_records").deleteMany({});
  await db.collection("employees").deleteMany({});
  await db.collection("users").deleteMany({});

  await setupTestUsers();

  const employees = [
    {
      employeeId: "EMP-INV-1",
      firstName: "Invited",
      lastName: "Employee",
      email: "invited.employee@test.com",
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-INV-2",
      firstName: "Not",
      lastName: "Completed",
      email: "not.completed@test.com",
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ONBOARDING",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-INV-3",
      firstName: "Token",
      lastName: "Employee",
      email: "token.employee@test.com",
      designation: "Designer",
      department: "Design",
      country: "USA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-INV-4",
      firstName: "Expired",
      lastName: "Employee",
      email: "expired.employee@test.com",
      designation: "Analyst",
      department: "Operations",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      // Shares an email with an already-active seeded user
      employeeId: "EMP-INV-5",
      firstName: "Duplicate",
      lastName: "Account",
      email: HR_EMAIL,
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      employeeId: "EMP-WM-1",
      firstName: "Workmail",
      lastName: "Employee",
      email: "workmail.personal@test.com",
      workMail: "workmail.employee@eniacinc.com",
      designation: "Engineer",
      department: "Engineering",
      country: "INDIA",
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const emp of employees) {
    await db.collection("employees").updateOne(
      { employeeId: emp.employeeId },
      { $set: emp },
      { upsert: true }
    );
  }

  // Completed onboarding for EMP-INV-1 (required before an invite can be sent)
  await db.collection("onboarding_records").updateOne(
    { employeeId: "EMP-INV-1" },
    {
      $set: {
        employeeId: "EMP-INV-1",
        currentStage: "TIMESHEET_ELIGIBILITY",
        status: "COMPLETED",
        completedStages: ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION"],
        documentRequirements: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

   // Completed onboarding for EMP-INV-5 (existing active user case)
   await db.collection("onboarding_records").updateOne(
     { employeeId: "EMP-INV-5" },
     {
       $set: {
         employeeId: "EMP-INV-5",
         currentStage: "TIMESHEET_ELIGIBILITY",
         status: "COMPLETED",
         completedStages: ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION"],
         documentRequirements: [],
         createdAt: new Date(),
         updatedAt: new Date()
       }
     },
     { upsert: true }
   );

   // Completed onboarding for EMP-WM-1 (workMail employee — invite should go to workMail)
   await db.collection("onboarding_records").updateOne(
     { employeeId: "EMP-WM-1" },
     {
       $set: {
         employeeId: "EMP-WM-1",
         currentStage: "TIMESHEET_ELIGIBILITY",
         status: "COMPLETED",
         completedStages: ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW", "ACTIVATION"],
         documentRequirements: [],
         createdAt: new Date(),
         updatedAt: new Date()
       }
     },
     { upsert: true }
   );

  // PENDING users + invitations with known raw tokens (created out-of-band so
  // tests can exercise the public token endpoints with a known token)
  const userRepository = new UserRepository();
  const invitationRepository = new InvitationRepository();

  const validToken = randomBytes(32).toString("hex");
  const expiredToken = randomBytes(32).toString("hex");
  // Separate expired token for the accept test: the GET test lazily marks the
  // first expired invitation as EXPIRED, which would flip the error code.
  const expiredAcceptToken = randomBytes(32).toString("hex");

  const pendingUser = await userRepository.create({
    userId: "user_EMP-INV-3",
    email: "token.employee@test.com",
    firstName: "Token",
    lastName: "Employee",
    role: "EMPLOYEE",
    status: "PENDING",
    employeeId: "EMP-INV-3",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const expiredUser = await userRepository.create({
    userId: "user_EMP-INV-4",
    email: "expired.employee@test.com",
    firstName: "Expired",
    lastName: "Employee",
    role: "EMPLOYEE",
    status: "PENDING",
    employeeId: "EMP-INV-4",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await invitationRepository.create({
    tokenHash: hashToken(validToken),
    userId: pendingUser.userId,
    employeeId: "EMP-INV-3",
    email: "token.employee@test.com",
    role: "EMPLOYEE",
    status: "PENDING",
    invitedByRole: "HR",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await invitationRepository.create({
    tokenHash: hashToken(expiredToken),
    userId: expiredUser.userId,
    employeeId: "EMP-INV-4",
    email: "expired.employee@test.com",
    role: "EMPLOYEE",
    status: "PENDING",
    invitedByRole: "HR",
    expiresAt: new Date(Date.now() - 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const expiredAcceptUser = await userRepository.create({
    userId: "user_EMP-INV-6",
    email: "expired.accept@test.com",
    firstName: "Expired",
    lastName: "Accept",
    role: "EMPLOYEE",
    status: "PENDING",
    employeeId: "EMP-INV-6",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await invitationRepository.create({
    tokenHash: hashToken(expiredAcceptToken),
    userId: expiredAcceptUser.userId,
    employeeId: "EMP-INV-6",
    email: "expired.accept@test.com",
    role: "EMPLOYEE",
    status: "PENDING",
    invitedByRole: "HR",
    expiresAt: new Date(Date.now() - 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return { validToken, expiredToken, expiredAcceptToken };
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

describe("Account Invitations", () => {
  let app: Express;
  let validToken: string;
  let expiredToken: string;
  let expiredAcceptToken: string;

  beforeAll(async () => {
    await connectDatabase();
    ({ validToken, expiredToken, expiredAcceptToken } = await setupInvitationData());
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/v1/onboarding/:employeeId/invite", () => {
    it("HR can send an invitation for a completed onboarding", async () => {
      const token = await getAccessToken(app, HR_EMAIL);
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-INV-1/invite")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-INV-1");
      expect(res.body.data.email).toBe("invited.employee@test.com");
      expect(res.body.data.role).toBe("EMPLOYEE");
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.emailSent).toBe(true);
      expect(res.body.data.expiresAt).toBeDefined();
      // The raw token must never be returned to the client
      expect(JSON.stringify(res.body)).not.toContain("token=");
    });

    it("creates a user without a password that cannot log in yet", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "invited.employee@test.com", password: NEW_PASSWORD })
        .expect(401);

      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
      expect(res.body.error.message).toContain("invitation");
    });

    it("allows inviting an employee whose onboarding is not completed", async () => {
      const token = await getAccessToken(app, HR_EMAIL);
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-INV-2/invite")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.emailSent).toBe(true);
    });

    it("allows resending an invitation for the same employee", async () => {
      const token = await getAccessToken(app, HR_EMAIL);
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-INV-1/invite")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.emailSent).toBe(true);
    });

    it("allows inviting an employee that already has an active account", async () => {
      const token = await getAccessToken(app, HR_EMAIL);
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-INV-5/invite")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.emailSent).toBe(true);
    });

    it("returns 403 for non-HR/non-Admin roles", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/onboarding/EMP-INV-1/invite")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

     it("returns 404 for a non-existent employee", async () => {
       const token = await getAccessToken(app, HR_EMAIL);
       const res = await request(app)
         .post("/api/v1/onboarding/EMP-NONEXISTENT/invite")
         .set("Authorization", `Bearer ${token}`)
         .expect(404);

       expect(res.body.error.code).toBe("NOT_FOUND");
     });

     it("sends invitation to workMail when provided (employee with workMail)", async () => {
       const token = await getAccessToken(app, HR_EMAIL);
       const db = getDb();

       // Clear audit logs for this employee to check the invite
       await db.collection("audit_logs").deleteMany({
         entityType: "invitation",
         entityId: "EMP-WM-1"
       });

       const res = await request(app)
         .post("/api/v1/onboarding/EMP-WM-1/invite")
         .set("Authorization", `Bearer ${token}`)
         .expect(201);

       expect(res.body.success).toBe(true);
       expect(res.body.data.employeeId).toBe("EMP-WM-1");
       expect(res.body.data.email).toBe("workmail.personal@test.com");
       expect(res.body.data.workMail).toBe("workmail.employee@eniacinc.com");
       expect(res.body.data.emailSent).toBe(true);

       // Verify the user was created with workMail
       const user = await db.collection("users").findOne({ employeeId: "EMP-WM-1" });
       expect(user).not.toBeNull();
       expect(user?.email).toBe("workmail.personal@test.com");
       expect(user?.workMail).toBe("workmail.employee@eniacinc.com");

       // Verify the invitation record stores workMail
       const invitations = await db.collection("invitations").find({ employeeId: "EMP-WM-1" }).toArray();
       expect(invitations.length).toBeGreaterThanOrEqual(1);
       expect(invitations[0].workMail).toBe("workmail.employee@eniacinc.com");
     });

     it("employee with workMail can log in using workMail", async () => {
       // The user was created in the previous test; login should work with workMail
       const db = getDb();
       const { hashPassword } = await import("../src/utils/auth/jwt.js");
       const hashed = await hashPassword(NEW_PASSWORD);
       await db.collection("users").updateOne(
         { employeeId: "EMP-WM-1" },
         { $set: { hashedPassword: hashed, status: "ACTIVE" } }
       );

       const res = await request(app)
         .post("/api/v1/auth/login")
         .send({ email: "workmail.employee@eniacinc.com", password: NEW_PASSWORD })
         .expect(200);

       expect(res.body.success).toBe(true);
       expect(res.body.data.user.email).toBe("workmail.personal@test.com");
     });
  });

  describe("GET /api/v1/invitations/:token", () => {
    it("returns the account preview for a valid token (no auth required)", async () => {
      const res = await request(app)
        .get(`/api/v1/invitations/${validToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-INV-3");
      expect(res.body.data.employeeName).toBe("Token Employee");
      expect(res.body.data.email).toBe("token.employee@test.com");
      expect(res.body.data.role).toBe("EMPLOYEE");
    });

    it("returns 404 for an unknown token", async () => {
      const res = await request(app)
        .get(`/api/v1/invitations/${randomBytes(32).toString("hex")}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 422 for an expired token", async () => {
      const res = await request(app)
        .get(`/api/v1/invitations/${expiredToken}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVITATION_EXPIRED");
    });
  });

  describe("POST /api/v1/invitations/:token/accept", () => {
    it("rejects a password that does not meet the policy", async () => {
      const res = await request(app)
        .post(`/api/v1/invitations/${validToken}/accept`)
        .send({ password: "short" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a password without letters or digits", async () => {
      const res = await request(app)
        .post(`/api/v1/invitations/${validToken}/accept`)
        .send({ password: "########" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("sets the password, activates the account, and allows login", async () => {
      const acceptRes = await request(app)
        .post(`/api/v1/invitations/${validToken}/accept`)
        .send({ password: NEW_PASSWORD })
        .expect(200);

      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.data.employeeId).toBe("EMP-INV-3");
      expect(acceptRes.body.data.message).toContain("Password set successfully");

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "token.employee@test.com", password: NEW_PASSWORD })
        .expect(200);

      expect(loginRes.body.data.user.email).toBe("token.employee@test.com");
      expect(loginRes.body.data.user.role).toBe("EMPLOYEE");
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it("cannot be reused (single-use token)", async () => {
      const res = await request(app)
        .post(`/api/v1/invitations/${validToken}/accept`)
        .send({ password: "Another123" })
        .expect(422);

      expect(res.body.error.code).toBe("INVITATION_INVALID");
    });

    it("rejects accepting with an unknown token", async () => {
      const res = await request(app)
        .post(`/api/v1/invitations/${randomBytes(32).toString("hex")}/accept`)
        .send({ password: NEW_PASSWORD })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rejects accepting an expired token", async () => {
      const res = await request(app)
        .post(`/api/v1/invitations/${expiredAcceptToken}/accept`)
        .send({ password: NEW_PASSWORD })
        .expect(422);

      expect(res.body.error.code).toBe("INVITATION_EXPIRED");
    });
  });
});
