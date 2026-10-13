import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { ObjectId } from "mongodb";

async function setupUsers() {
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

describe("Phase 17 — Reports", () => {
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
    const now = new Date();

    await db.collection("employees").deleteMany({});
    await db.collection("clients").deleteMany({});
    await db.collection("projects").deleteMany({});
    await db.collection("project_assignments").deleteMany({});
    await db.collection("leave_requests").deleteMany({});
    await db.collection("leave_balances").deleteMany({});
    await db.collection("leave_types").deleteMany({});
    await db.collection("documents").deleteMany({});
    await db.collection("employee_reviews").deleteMany({});
    await db.collection("onboarding_records").deleteMany({});
    await db.collection("attendance_records").deleteMany({});
    await db.collection("employee_compensation_history").deleteMany({});
    await db.collection("employee_bill_rate_history").deleteMany({});

    await db.collection("employees").insertMany([
      {
        _id: new ObjectId(),
        employeeId: "EMP-001",
        firstName: "Admin",
        lastName: "User",
        email: "emp1@test.com",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        billingStatus: "BILLABLE",
        joiningDate: new Date("2023-01-15"),
        address: { city: "Bangalore", state: "Karnataka", country: "INDIA" },
        compensation: {
          salary: { amount: 70000, currency: "INR", payFrequency: "MONTHLY" },
          billRate: { amount: 50, currency: "INR", unit: "HOURLY" }
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        employeeId: "EMP-002",
        firstName: "HR",
        lastName: "User",
        email: "emp2@test.com",
        designation: "Manager",
        department: "HR",
        country: "USA",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        billingStatus: "NON_BILLABLE",
        joiningDate: new Date("2023-06-01"),
        address: { city: "NYC", state: "NY", country: "USA" },
        compensation: {
          salary: { amount: 80000, currency: "USD", payFrequency: "MONTHLY" },
          billRate: { amount: 0, currency: "USD", unit: "HOURLY" }
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        employeeId: "EMP-005",
        firstName: "Employee",
        lastName: "User",
        email: "emp5@test.com",
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        employmentType: "FULL_TIME",
        billingStatus: "NON_BILLABLE",
        joiningDate: new Date("2024-01-01"),
        address: { city: "Pune", state: "MH", country: "INDIA" },
        createdAt: now,
        updatedAt: now
      }
    ]);

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
        createdAt: now,
        updatedAt: now
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
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        projectId: "PROJ-002",
        clientId: "CLI-001",
        name: "Project Beta",
        code: "PROJ002",
        status: "COMPLETED",
        health: "COMPLETED",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        managerId: "EMP-003",
        progressPercent: 100,
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection("project_assignments").insertMany([
      {
        _id: new ObjectId(),
        assignmentId: "ASG-001",
        employeeId: "EMP-001",
        projectId: "PROJ-001",
        role: "Developer",
        allocationPercent: 100,
        billable: true,
        startDate: new Date("2024-01-01"),
        endDate: null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        assignmentId: "ASG-002",
        employeeId: "EMP-005",
        projectId: "PROJ-001",
        role: "Tester",
        allocationPercent: 50,
        billable: true,
        startDate: new Date("2024-02-01"),
        endDate: null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection("leave_requests").insertMany([
      {
        _id: new ObjectId(),
        requestId: "LR-TEST-1",
        employeeId: "EMP-001",
        leaveType: "PAID",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-05"),
        days: 5,
        status: "APPROVED",
        reason: "Vacation",
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        requestId: "LR-TEST-2",
        employeeId: "EMP-001",
        leaveType: "SICK",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        days: 2,
        status: "PENDING",
        reason: "Illness",
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection("leave_types").insertMany([
      { _id: new ObjectId(), typeId: "LT-PAID", code: "PAID", name: "Paid Leave", annualAllowance: 20, requiresApproval: true, active: true },
      { _id: new ObjectId(), typeId: "LT-SICK", code: "SICK", name: "Sick Leave", annualAllowance: 10, requiresApproval: true, active: true }
    ]);

    await db.collection("leave_balances").insertMany([
      { _id: new ObjectId(), employeeId: "EMP-001", leaveType: "PAID", balance: 15, createdAt: now, updatedAt: now },
      { _id: new ObjectId(), employeeId: "EMP-001", leaveType: "SICK", balance: 8, createdAt: now, updatedAt: now }
    ]);

    await db.collection("documents").insertMany([
      {
        _id: new ObjectId(),
        documentId: "DOC-001",
        employeeId: "EMP-001",
        type: "PASSPORT",
        name: "Passport",
        status: "APPROVED",
        fileUrl: "/files/passport.pdf",
        uploadedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
      },
      {
        _id: new ObjectId(),
        documentId: "DOC-002",
        employeeId: "EMP-001",
        type: "VISA",
        name: "Visa",
        status: "PENDING",
        fileUrl: "/files/visa.pdf",
        uploadedAt: new Date("2024-06-01"),
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        createdAt: new Date("2024-06-01"),
        updatedAt: new Date("2024-06-01")
      }
    ]);

    await db.collection("employee_reviews").insertMany([
      {
        _id: new ObjectId(),
        reviewId: "REVIEW-001",
        employeeId: "EMP-001",
        reviewerId: "EMP-003",
        reviewPeriod: "2025-Q1",
        rating: 4,
        status: "SCHEDULED",
        reviewDate: new Date("2025-06-15"),
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection("onboarding_records").insertMany([
      {
        _id: new ObjectId(),
        employeeId: "EMP-005",
        status: "AWAITING_REVIEW",
        stage: "HR_REVIEW",
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection("attendance_records").insertMany([
      {
        _id: new ObjectId(),
        attendanceId: "ATT-001",
        employeeId: "EMP-001",
        date: new Date().toISOString().split("T")[0],
        status: "PRESENT",
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 8 * 60 * 60 * 1000),
        totalMinutes: 480,
        workingHours: 8,
        createdAt: now,
        updatedAt: now
      }
    ]);
  });

  describe("GET /api/v1/reports — Report Definitions", () => {
    it("returns all report categories and definitions", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toBeDefined();
      expect(res.body.data.reports).toBeDefined();
      expect(res.body.data.reports.length).toBe(20);
    });

    it("filters reports by category", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports?category=workforce")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reports.length).toBe(5);
      expect(res.body.data.reports[0].category).toBe("workforce");
    });

    it("unauthenticated request receives 401", async () => {
      const res = await request(app).get("/api/v1/reports").expect(401);

      expect(res.body.success).toBe(false);
    });

    it("EMPLOYEE cannot access (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/reports/:reportId — Generate Report", () => {
    it("generates workforce-headcount report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("workforce-headcount");
      expect(res.body.data.columns).toContain("Department");
      expect(res.body.data.columns).toContain("Headcount");
      expect(Array.isArray(res.body.data.rows)).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalEmployees).toBeGreaterThan(0);
    });

    it("generates attendance-monthly report with employeeId filter", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/attendance-monthly?employeeId=EMP-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("attendance-monthly");
      expect(res.body.data.rows.length).toBeGreaterThan(0);
      expect(res.body.data.rows[0]).toHaveProperty("Employee");
      expect(res.body.data.rows[0]).toHaveProperty("Status");
    });

    it("generates leave-requests report with pagination", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/leave-requests?page=1&pageSize=1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("leave-requests");
      expect(res.body.data.rows.length).toBe(1);
      expect(res.body.data.summary.totalRequests).toBe(2);
    });

    it("generates documents-status report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/documents-status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("documents-status");
      expect(res.body.data.rows.length).toBe(2);
      expect(res.body.data.summary.statusCounts).toBeDefined();
    });

    it("generates documents-expiry report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/documents-expiry")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("documents-expiry");
      expect(res.body.data.rows.length).toBe(1);
      expect(res.body.data.rows[0]).toHaveProperty("Expiry Date");
    });

    it("generates projects-status report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/projects-status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("projects-status");
      expect(res.body.data.rows.length).toBe(2);
      expect(res.body.data.rows[0]).toHaveProperty("Project");
    });

    it("generates assignments-report with projectId filter", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/assignments-report?projectId=PROJ-001")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("assignments-report");
      expect(res.body.data.rows.length).toBe(2);
      expect(res.body.data.summary.active).toBe(2);
    });

    it("generates compensation-salary report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/compensation-salary")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("compensation-salary");
      expect(res.body.data.rows.length).toBe(2);
    });

    it("generates workforce-billable report", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/workforce-billable")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("workforce-billable");
      expect(res.body.data.summary.billable).toBe(1);
      expect(res.body.data.summary.nonBillable).toBe(2);
    });

    it("MANAGER can access reports", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/workforce-new-joiners")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reportId).toBe("workforce-new-joiners");
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });

    it("returns 404 for unknown report ID", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/nonexistent-report")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toEqual(["ID"]);
      expect(res.body.data.summary?.message).toBe("Report not found.");
    });

    it("unauthenticated request receives 401", async () => {
      const res = await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("EMPLOYEE can access reports (has report.view via... wait)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/workforce-headcount")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/reports/:reportId — Category routes", () => {
    it("employees returns workforce reports", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/employees")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reports.length).toBe(5);
      expect(res.body.data.reports[0].category).toBe("workforce");
    });

    it("attendance returns attendance reports", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reports.length).toBe(3);
    });

    it("billing returns compensation reports", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/billing")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reports.length).toBe(3);
    });

    it("unknown category returns 404", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reports/unknown-category")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toEqual(["ID"]);
      expect(res.body.data.summary?.message).toBe("Report not found.");
    });
  });
});
