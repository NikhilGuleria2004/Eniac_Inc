import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");
  const attendance = db.collection("attendance_records");
  const corrections = db.collection("attendance_corrections");

  await employees.deleteMany({});
  await attendance.deleteMany({});
  await corrections.deleteMany({});

  const testEmployees = [
    {
      employeeId: "EMP-ATT-1",
      firstName: "Att",
      lastName: "Owner",
      email: "att.owner@test.com",
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
      employeeId: "EMP-ATT-2",
      firstName: "Second",
      lastName: "Employee",
      email: "second.att@test.com",
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

async function clearEmployeeAttendance(employeeId: string): Promise<void> {
  const db = getDb();
  await db.collection("attendance_records").deleteMany({ employeeId });
  await db.collection("attendance_corrections").deleteMany({ employeeId });
}

async function seedAttendanceRecord(
  employeeId: string,
  options: { correctionRequested?: boolean } = {}
): Promise<string> {
  const db = getDb();
  const { ObjectId } = await import("mongodb");
  const attendanceId = `ATT-SEED-${employeeId}-${Date.now()}`;
  await db.collection("attendance_records").insertOne({
    _id: new ObjectId(),
    attendanceId,
    employeeId,
    date: new Date(),
    checkIn: new Date(Date.now() - 8 * 3600000),
    checkOut: new Date(),
    status: "P",
    totalMinutes: 480,
    workingHours: 8,
    correctionRequested: options.correctionRequested ?? false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return attendanceId;
}

describe("Phase 6 — Attendance", () => {
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
    await clearEmployeeAttendance("EMP-005");
    const db = getDb();
    await db.collection("attendance_records").deleteMany({});
    await db.collection("attendance_corrections").deleteMany({});
  });

  describe("POST /api/v1/attendance/check-in", () => {
    it("EMPLOYEE can check in for self", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.status).toBe("PRESENT");
      expect(res.body.data.checkIn).toBeDefined();
    });

    it("prevents duplicate check-in for same date", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(422);

      expect(res.body.error.code).toBe("DUPLICATE_CHECK_IN");
    });

    it("EMPLOYEE marks for self even if another employeeId is supplied", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ATT-1" })
        .expect(201);

      expect(res.body.data.employeeId).toBe("EMP-005");
    });

    it("ADMIN cannot check in (403)", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("HR can check in (201 - has attendance.mark permission)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ATT-1" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-ATT-1");
    });

    it("MANAGER can check in (201 - has attendance.mark permission)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-ATT-2" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-ATT-2");
    });
  });

  describe("POST /api/v1/attendance/check-out", () => {
    it("EMPLOYEE can check out after check-in", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOut).toBeDefined();
      expect(res.body.data.workingHours).toBeGreaterThanOrEqual(0);
    });

    it("prevents check-out without check-in", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(422);

      expect(res.body.error.code).toBe("CHECK_IN_REQUIRED");
    });

    it("prevents duplicate check-out", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(422);

      expect(res.body.error.code).toBe("DUPLICATE_CHECK_OUT");
    });

    it("ADMIN cannot check out (403)", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("GET /api/v1/attendance — List", () => {
    it("HR can list attendance records", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own attendance", async () => {
      await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((rec: { employeeId: string }) => {
        expect(rec.employeeId).toBe("EMP-005");
      });
    });

    it("MANAGER can list attendance (operational view)", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("SUPERVISOR can list attendance (operational view)", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("ADMIN can list attendance (reporting) but not mark", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("supports status filter", async () => {
      await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance?status=P")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((rec: { status: string }) => {
        expect(rec.status).toBe("PRESENT");
      });
    });
  });

  describe("GET /api/v1/attendance/:employeeId — Employee attendance", () => {
    it("HR can view employee attendance", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/EMP-ATT-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((rec: { employeeId: string }) => {
        expect(rec.employeeId).toBe("EMP-ATT-1");
      });
      expect(attId).toBeDefined();
    });

    it("EMPLOYEE cannot view another employee's attendance (IDOR)", async () => {
      await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/EMP-ATT-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("EMPLOYEE can view own attendance", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/EMP-005")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("returns 404 for non-existent employee", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/EMP-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/attendance/:attendanceId — HR/Admin management", () => {
    it("HR can update attendance record status", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch(`/api/v1/attendance/${attId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "LATE", notes: "Corrected by HR" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("LATE");
    });

    it("EMPLOYEE cannot update attendance (403)", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .patch(`/api/v1/attendance/${attId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "ABSENT" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("MANAGER cannot update attendance (403)", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .patch(`/api/v1/attendance/${attId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "ABSENT" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("ADMIN can update attendance record", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .patch(`/api/v1/attendance/${attId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "PRESENT" })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("prevents check-out before check-in (422)", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .patch(`/api/v1/attendance/${attId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          checkIn: "2030-01-01T18:00:00Z",
          checkOut: "2030-01-01T09:00:00Z"
        })
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_TIMESTAMP");
    });
  });

  describe("Attendance Corrections", () => {
    it("EMPLOYEE can request correction on own record", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Forgot to check out" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("EMPLOYEE cannot request correction on another's record (IDOR)", async () => {
      const attId = await seedAttendanceRecord("EMP-ATT-1");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Wrong" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("prevents duplicate correction request (422)", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "First request" })
        .expect(201);

      const res = await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Second request" })
        .expect(422);

      expect(res.body.error.code).toBe("CORRECTION_ALREADY_PENDING");
    });

    it("HR can list corrections", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/corrections")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("EMPLOYEE cannot list corrections (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/attendance/corrections")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("HR can approve a pending correction", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${empToken}`)
        .send({ reason: "Need correction" })
        .expect(201);

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const correctionsRes = await request(app)
        .get("/api/v1/attendance/corrections?status=PENDING")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const target = correctionsRes.body.data.find(
        (c: { attendanceId: string }) => c.attendanceId === attId
      );
      expect(target).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/attendance/corrections/${target.correctionId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ comments: "Approved by HR" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVED");
    });

    it("HR can reject a pending correction", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${empToken}`)
        .send({ reason: "Need correction" })
        .expect(201);

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const correctionsRes = await request(app)
        .get("/api/v1/attendance/corrections?status=PENDING")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const target = correctionsRes.body.data.find(
        (c: { attendanceId: string }) => c.attendanceId === attId
      );
      expect(target).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/attendance/corrections/${target.correctionId}/reject`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ comments: "Rejected by HR" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("REJECTED");
    });

    it("prevents approving an already-resolved correction (422)", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${empToken}`)
        .send({ reason: "Need correction" })
        .expect(201);

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const correctionsRes = await request(app)
        .get("/api/v1/attendance/corrections?status=PENDING")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const target = correctionsRes.body.data.find(
        (c: { attendanceId: string }) => c.attendanceId === attId
      );

      await request(app)
        .post(`/api/v1/attendance/corrections/${target.correctionId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ comments: "First approval" })
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/attendance/corrections/${target.correctionId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ comments: "Second approval" })
        .expect(422);

      expect(res.body.error.code).toBe("CORRECTION_ALREADY_RESOLVED");
    });

    it("requires comments for correction review (400)", async () => {
      const attId = await seedAttendanceRecord("EMP-005");
      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post(`/api/v1/attendance/${attId}/correction`)
        .set("Authorization", `Bearer ${empToken}`)
        .send({ reason: "Need correction" })
        .expect(201);

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const correctionsRes = await request(app)
        .get("/api/v1/attendance/corrections?status=PENDING")
        .set("Authorization", `Bearer ${hrToken}`)
        .expect(200);

      const target = correctionsRes.body.data.find(
        (c: { attendanceId: string }) => c.attendanceId === attId
      );

      const res = await request(app)
        .post(`/api/v1/attendance/corrections/${target.correctionId}/approve`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({})
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for attendance actions", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "attendance" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "attendance.checked_in")).toBe(true);
    });
  });
});
