import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { registerEventListeners } from "../src/integrations/event-listeners.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";
import { ObjectId } from "mongodb";

async function setupUsers() {
  const db = getDb();
  const notifications = db.collection("notifications");

  await notifications.deleteMany({});

  await setupTestUsers();

  const now = new Date();
  const testNotifications = [
    {
      _id: new ObjectId(),
      notificationId: "NOT-TEST-1",
      userId: "user_employee",
      type: "LEAVE",
      title: "Leave request pending approval",
      message: "You requested leave that is pending approval.",
      read: false,
      link: "/leave",
      createdAt: new Date(now.getTime() - 86400000),
      updatedAt: new Date(now.getTime() - 86400000)
    },
    {
      _id: new ObjectId(),
      notificationId: "NOT-TEST-2",
      userId: "user_employee",
      type: "DOCUMENT",
      title: "Document requires review",
      message: "Your document is pending review.",
      read: true,
      link: "/documents",
      createdAt: new Date(now.getTime() - 172800000),
      updatedAt: new Date(now.getTime() - 172800000)
    },
    {
      _id: new ObjectId(),
      notificationId: "NOT-TEST-3",
      userId: "user_hr",
      type: "SYSTEM",
      title: "System notice",
      message: "System maintenance scheduled.",
      read: false,
      link: "/settings",
      createdAt: new Date(now.getTime() - 259200000),
      updatedAt: new Date(now.getTime() - 259200000)
    }
  ];

  await notifications.insertMany(testNotifications);
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

describe("Phase 14 — Notifications", () => {
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

  beforeEach(async () => {
    const db = getDb();
    const ids = ["NOT-TEST-1", "NOT-TEST-2", "NOT-TEST-3"];
    const now = new Date();
    const batch = ids.map((id, i) => ({
      _id: new ObjectId(),
      notificationId: id,
      userId: i < 2 ? "user_employee" : "user_hr",
      type: ["LEAVE", "DOCUMENT", "SYSTEM"][i] as string,
      title: ["Leave request pending approval", "Document requires review", "System notice"][i],
      message: ["You requested leave.", "Your document is pending.", "Maintenance scheduled."][i],
      read: i < 2 ? i === 0 ? false : true : false,
      link: ["/leave", "/documents", "/settings"][i],
      createdAt: new Date(now.getTime() - (i + 1) * 86400000),
      updatedAt: new Date(now.getTime() - (i + 1) * 86400000)
    }));

    await db.collection("notifications").deleteMany({});
    await db.collection("notifications").insertMany(batch);

    // Reset employee and onboarding state for event-based tests
    await db.collection("employees").updateOne(
      { employeeId: "EMP-005" },
      {
        $set: {
          employeeId: "EMP-005",
          employmentStatus: "ACTIVE",
          billingStatus: "BILLABLE",
          firstName: "Employee",
          lastName: "User",
          email: "employee@eniacinc.com",
          phone: "+1-555-0100",
          designation: "Staff",
          department: "Operations",
          country: "INDIA",
          employmentType: "FULL_TIME",
          joiningDate: new Date("2020-01-01"),
          address: { line1: "1 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    await db.collection("onboarding_records").deleteMany({});
    await db.collection("leave_requests").deleteMany({});
    await db.collection("leave_balances").deleteMany({});
    await db.collection("leave_types").deleteMany({});
    await db.collection("leave_types").insertMany([
      { typeId: "LT-PAID", code: "PAID", name: "Paid Leave", annualAllowance: 20, requiresApproval: true, active: true },
      { typeId: "LT-SICK", code: "SICK", name: "Sick Leave", annualAllowance: 10, requiresApproval: true, active: true }
    ]);
    await db.collection("leave_balances").insertMany([
      { _id: new ObjectId(), employeeId: "EMP-005", leaveType: "PAID", balance: 20, createdAt: new Date(), updatedAt: new Date() },
      { _id: new ObjectId(), employeeId: "EMP-005", leaveType: "SICK", balance: 10, createdAt: new Date(), updatedAt: new Date() }
    ]);
  });

  describe("GET /api/v1/notifications — List", () => {
    it("EMPLOYEE can list own notifications", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it("notices are scoped to the requesting user", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      res.body.data.forEach((n: { userId: string }) => {
        expect(n.userId).toBe("user_employee");
      });
    });

    it("ADMIN can list own notifications", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it("unauthenticated requests receive 401", async () => {
      const res = await request(app)
        .get("/api/v1/notifications")
        .expect(401);

      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("supports type filter", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications?type=SYSTEM")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].type).toBe("SYSTEM");
    });

    it("supports read filter", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications?read=true")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].read).toBe(true);
    });

    it("supports read=false filter", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications?read=false")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((n: { read: boolean }) => {
        expect(n.read).toBe(false);
      });
    });
  });

  describe("GET /api/v1/notifications/unread-count", () => {
    it("returns correct unread count for EMPLOYEE", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it("returns correct unread count for HR", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe("POST /api/v1/notifications/:notificationId/read", () => {
    it("EMPLOYEE can mark own notification as read", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/notifications/NOT-TEST-1/read")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);
    });

    it("returns 404 for non-existent notification", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/notifications/NOT-NONEXISTENT/read")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("EMPLOYEE cannot mark another user's notification as read (IDOR)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/notifications/NOT-TEST-3/read")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/v1/notifications/read-all", () => {
    it("marks all of the user's notifications as read", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
    });

    it("subsequent unread count is zero", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.count).toBe(0);
    });
  });

  describe("Role-based access", () => {
    it("MANAGER can view notifications", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("SUPERVISOR can view notifications", async () => {
      const token = await getAccessToken(app, "supervisor@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("MANAGER can view unread count", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("MANAGER can mark all read", async () => {
      const token = await getAccessToken(app, "manager@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe("Event-based notification generation", () => {
    it("creates a notification when leave is submitted", async () => {
      const db = getDb();
      await db.collection("leave_requests").deleteMany({});
      await db.collection("leave_balances").deleteMany({});
      await db.collection("leave_types").deleteMany({});

      await db.collection("leave_types").insertMany([
        { typeId: "LT-PAID", code: "PAID", name: "Paid Leave", annualAllowance: 20, requiresApproval: true, active: true }
      ]);
      await db.collection("leave_balances").insertOne({
        _id: new ObjectId(),
        employeeId: "EMP-005",
        leaveType: "PAID",
        balance: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const token = await getAccessToken(app, "employee@eniacinc.com");
      const futureDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 10);
        return d.toISOString().split("T")[0];
      };
      const futureDateEnd = () => {
        const d = new Date();
        d.setDate(d.getDate() + 12);
        return d.toISOString().split("T")[0];
      };

      await request(app)
        .post("/api/v1/leave/request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          leaveType: "PAID",
          startDate: futureDate(),
          endDate: futureDateEnd(),
          reason: "Vacation"
        })
        .expect(201);

      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const hrRes = await request(app)
        .get("/api/v1/notifications?read=false")
        .set("Authorization", `Bearer ${hrToken}`);

      const leaveNotifs = hrRes.body.data.filter((n: { type: string }) => n.type === "LEAVE");
      expect(leaveNotifs.length).toBeGreaterThanOrEqual(1);
      expect(leaveNotifs[0].title).toBe("Leave request pending approval");
    });

    it("creates a notification when an employee is activated", async () => {
      const db = getDb();
      await db.collection("onboarding_records").deleteMany({});
      await db.collection("notification_events_test").deleteMany({});

      await db.collection("onboarding_records").insertOne({
        _id: new ObjectId(),
        employeeId: "EMP-005",
        currentStage: "ACTIVATION",
        status: "REVIEWED",
        completedStages: ["EMPLOYEE_INFORMATION", "EMPLOYMENT_DETAILS", "GEOGRAPHY", "BILLING_CLASSIFICATION", "DOCUMENTS", "HR_REVIEW"],
        documentRequirements: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await db.collection("employees").updateOne(
        { employeeId: "EMP-005" },
        {
          $set: {
            employmentStatus: "ONBOARDING",
            billingStatus: "BILLABLE",
            firstName: "Employee",
            lastName: "User",
            email: "employee@eniacinc.com",
            designation: "Staff",
            department: "Operations",
            country: "INDIA",
            address: { line1: "1 St", city: "Bangalore", state: "Karnataka", country: "INDIA" }
          }
        }
      );

      // C2: Create APPROVED documents for EMP-005 so validateOnboardingCompletion passes
      const docTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF"];
      await db.collection("documents").deleteMany({ employeeId: "EMP-005" });
      for (const type of docTypes) {
        await db.collection("documents").insertOne({
          documentId: `DOC-NOTIF-${type}`,
          employeeId: "EMP-005",
          type,
          name: `${type.replace(/_/g, " ")}`,
          status: "APPROVED",
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const approveRes = await request(app)
        .post("/api/v1/onboarding/EMP-005/approve")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(approveRes.body.success).toBe(true);

      // Per Phase A, approval (review-passed) does NOT activate the employee.
      // Activation is a separate step that makes the employee live and fires
      // the "Employee activated" notification + the timesheet handoff.
      await request(app)
        .post("/api/v1/onboarding/EMP-005/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const notifRes = await request(app)
        .get("/api/v1/notifications?read=false&type=ONBOARDING")
        .set("Authorization", `Bearer ${empToken}`);

      const onboardingNotifs = notifRes.body.data.filter((n: { title: string }) =>
        n.title === "Employee activated"
      );
      expect(onboardingNotifs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
