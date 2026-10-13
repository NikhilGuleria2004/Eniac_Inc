import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { ObjectId } from "mongodb";

const EMP_DATA = [
  { employeeId: "EMP-001", role: "ADMIN" },
  { employeeId: "EMP-002", role: "HR" },
  { employeeId: "EMP-003", role: "MANAGER" },
  { employeeId: "EMP-004", role: "SUPERVISOR" },
  { employeeId: "EMP-005", role: "EMPLOYEE" }
];

async function setupUsers() {
  const db = getDb();

  await setupTestUsers();

  for (let i = 0; i < EMP_DATA.length; i++) {
    const emp = EMP_DATA[i];
    await db.collection("employees").updateOne(
      { employeeId: emp.employeeId },
      {
        $set: {
          employeeId: emp.employeeId,
          firstName: `Emp${i + 1}`,
          lastName: "User",
          email: `emp${i + 1}@test.com`,
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: i === 0 ? "ACTIVE" : i === 1 ? "ACTIVE" : i === 2 ? "ACTIVE" : i === 3 ? "ACTIVE" : "ACTIVE",
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

describe("Phase 16 — Dashboards", () => {
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
    await db.collection("projects").deleteMany({});
    await db.collection("clients").deleteMany({});
    await db.collection("leave_requests").deleteMany({});
    await db.collection("documents").deleteMany({});
    await db.collection("employee_reviews").deleteMany({});
    await db.collection("onboarding_records").deleteMany({});
    await db.collection("attendance_records").deleteMany({});
    await db.collection("audit_logs").deleteMany({});

    await db.collection("clients").insertMany([
      {
        _id: new ObjectId(),
        clientId: "CLI-001",
        code: "CLI001",
        name: "Client One",
        status: "ACTIVE",
        industry: "Tech",
        contact: { name: "John", email: "john@client.com", phone: "+1234567890" },
        address: { line1: "1 St", city: "NYC", state: "NY", country: "USA" },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        clientId: "CLI-002",
        code: "CLI002",
        name: "Client Two",
        status: "INACTIVE",
        industry: "Finance",
        contact: { name: "Jane", email: "jane@client.com", phone: "+1987654321" },
        address: { line1: "2 Ave", city: "LA", state: "CA", country: "USA" },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("projects").insertMany([
      {
        _id: new ObjectId(),
        projectId: "PROJ-001",
        clientId: "CLI-001",
        name: "Project Alpha",
        code: "PROJ001",
        status: "ACTIVE",
        health: "ON_TRACK",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        managerId: "EMP-003",
        progressPercent: 75,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        projectId: "PROJ-002",
        clientId: "CLI-001",
        name: "Project Beta",
        code: "PROJ002",
        status: "ACTIVE",
        health: "AT_RISK",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-11-30"),
        managerId: "EMP-003",
        progressPercent: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        projectId: "PROJ-003",
        clientId: "CLI-002",
        name: "Project Gamma",
        code: "PROJ003",
        status: "COMPLETED",
        health: "COMPLETED",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        managerId: "EMP-003",
        progressPercent: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("project_assignments").insertMany([
      {
        _id: new ObjectId(),
        assignmentId: "ASG-001",
        employeeId: "EMP-005",
        projectId: "PROJ-001",
        role: "Developer",
        allocationPercent: 100,
        billable: true,
        startDate: new Date("2024-01-01"),
        endDate: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        assignmentId: "ASG-002",
        employeeId: "EMP-004",
        projectId: "PROJ-002",
        role: "Developer",
        allocationPercent: 80,
        billable: true,
        startDate: new Date("2024-02-01"),
        endDate: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("leave_requests").insertMany([
      {
        _id: new ObjectId(),
        requestId: "LR-TEST-1",
        employeeId: "EMP-005",
        leaveType: "PAID",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-05"),
        days: 5,
        status: "PENDING",
        reason: "Vacation",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("documents").insertMany([
      {
        _id: new ObjectId(),
        documentId: "DOC-TEST-1",
        employeeId: "EMP-005",
        type: "PASSPORT",
        name: "Passport",
        status: "PENDING",
        fileUrl: "/files/passport.pdf",
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        documentId: "DOC-TEST-2",
        employeeId: "EMP-005",
        type: "VISA",
        name: "Visa",
        status: "APPROVED",
        fileUrl: "/files/visa.pdf",
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("employee_reviews").insertMany([
      {
        _id: new ObjectId(),
        reviewId: "REVIEW-TEST-1",
        employeeId: "EMP-005",
        reviewerId: "EMP-003",
        reviewPeriod: "2025-Q1",
        rating: 4,
        status: "SCHEDULED",
        reviewDate: new Date("2025-06-15"),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("onboarding_records").insertMany([
      {
        _id: new ObjectId(),
        employeeId: "EMP-005",
        status: "AWAITING_REVIEW",
        stage: "HR_REVIEW",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("attendance_records").insertMany([
      {
        _id: new ObjectId(),
        attendanceId: "ATT-TEST-1",
        employeeId: "EMP-005",
        date: new Date().toISOString().split("T")[0],
        status: "PRESENT",
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 8 * 60 * 60 * 1000),
        totalMinutes: 480,
        workingHours: 8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        attendanceId: "ATT-TEST-2",
        employeeId: "EMP-002",
        date: new Date().toISOString().split("T")[0],
        status: "MISSING",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await db.collection("audit_logs").insertMany([
      {
        _id: new ObjectId(),
        auditId: "AUD-test-1",
        actorUserId: "user_admin",
        actorRole: "ADMIN",
        action: "employee.updated",
        entityType: "employee",
        entityId: "EMP-001",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });

  describe("GET /api/v1/dashboard — Role-based routing", () => {
    it("ADMIN gets admin dashboard", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalEmployees");
      expect(res.body.data).toHaveProperty("activeEmployees");
      expect(res.body.data).toHaveProperty("billableEmployees");
      expect(res.body.data).toHaveProperty("nonBillableEmployees");
      expect(res.body.data).toHaveProperty("activeProjects");
      expect(res.body.data).toHaveProperty("activeClients");
      expect(res.body.data).toHaveProperty("pendingLeaveRequests");
      expect(res.body.data).toHaveProperty("pendingDocuments");
      expect(res.body.data).toHaveProperty("upcomingReviews");
      expect(res.body.data).toHaveProperty("attendanceExceptions");
      expect(res.body.data).toHaveProperty("employeeStatusDistribution");
      expect(res.body.data).toHaveProperty("workforceDistribution");
      expect(res.body.data).toHaveProperty("projectHealth");
      expect(res.body.data).toHaveProperty("recentActivity");
    });

    it("HR gets HR dashboard", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalEmployees");
      expect(res.body.data).toHaveProperty("pendingOnboarding");
      expect(res.body.data).toHaveProperty("pendingDocuments");
      expect(res.body.data).toHaveProperty("pendingLeaveRequests");
      expect(res.body.data).toHaveProperty("upcomingReviews");
      expect(res.body.data).toHaveProperty("documentsExpiringSoon");
      expect(res.body.data).toHaveProperty("employeeDistribution");
      expect(res.body.data).toHaveProperty("onboardingPipeline");
    });

    it("MANAGER gets manager dashboard", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("activeClients");
      expect(res.body.data).toHaveProperty("activeProjects");
      expect(res.body.data).toHaveProperty("assignedEmployees");
      expect(res.body.data).toHaveProperty("projectsAtRisk");
      expect(res.body.data).toHaveProperty("projectPortfolio");
      expect(res.body.data).toHaveProperty("resourceAllocation");
      expect(res.body.data).toHaveProperty("projectHealth");
    });

    it("SUPERVISOR gets supervisor dashboard", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("assignedProjects");
      expect(res.body.data).toHaveProperty("teamMembers");
      expect(res.body.data).toHaveProperty("activeAssignments");
      expect(res.body.data).toHaveProperty("projectsRequiringAttention");
      expect(res.body.data).toHaveProperty("myProjects");
      expect(res.body.data).toHaveProperty("teamAssignments");
    });

    it("EMPLOYEE gets employee dashboard", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("todayAttendance");
      expect(res.body.data).toHaveProperty("leaveBalance");
      expect(res.body.data).toHaveProperty("pendingLeaveRequests");
      expect(res.body.data).toHaveProperty("assignedProjects");
      expect(res.body.data).toHaveProperty("documents");
      expect(res.body.data).toHaveProperty("recentNotifications");
    });

    it("unauthenticated request receives 401", async () => {
      const res = await request(app).get("/api/v1/dashboard").expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/dashboard/admin — Explicit admin dashboard", () => {
    it("ADMIN can access", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEmployees).toBeGreaterThan(0);
      expect(res.body.data.activeProjects).toBe(2);
      expect(res.body.data.activeClients).toBe(1);
    });

    it("HR cannot access (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/dashboard/hr — Explicit HR dashboard", () => {
    it("HR can access", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/hr")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pendingOnboarding).toBe(1);
      expect(res.body.data.pendingLeaveRequests).toBe(1);
      expect(res.body.data.upcomingReviews).toBe(1);
    });

    it("EMPLOYEE cannot access (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/hr")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/dashboard/manager — Explicit manager dashboard", () => {
    it("MANAGER can access", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/manager")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.activeProjects).toBe(2);
      expect(res.body.data.projectsAtRisk).toBe(1);
      expect(res.body.data.projectPortfolio.length).toBe(3);
    });

    it("EMPLOYEE cannot access (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/manager")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/dashboard/supervisor — Explicit supervisor dashboard", () => {
    it("SUPERVISOR can access", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/supervisor")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("assignedProjects");
      expect(res.body.data).toHaveProperty("teamAssignments");
    });

    it("EMPLOYEE cannot access (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/supervisor")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/dashboard/employee — Explicit employee dashboard", () => {
    it("EMPLOYEE can access own dashboard", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/employee")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedProjects).toBeDefined();
      expect(Array.isArray(res.body.data.leaveBalance)).toBe(true);
      expect(res.body.data.pendingLeaveRequests).toBe(1);
    });

    it("HR cannot access employee dashboard (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/dashboard/employee")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});
