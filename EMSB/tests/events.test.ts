import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { registerEventListeners } from "../src/integrations/event-listeners.js";
import { integrationEvents } from "../src/integrations/events.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

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

async function seedEmployee(employeeId: string): Promise<void> {
  const db = getDb();
  await db.collection("employees").updateOne(
    { employeeId },
    {
      $set: {
        employeeId,
        firstName: "Event",
        lastName: "Tester",
        email: `${employeeId.toLowerCase()}@eniac.com`,
        designation: "Engineer",
        department: "Engineering",
        country: "INDIA",
        employmentStatus: "ONBOARDING",
        billingStatus: "BILLABLE",
        address: { line1: "1 St", city: "Bangalore", state: "Karnataka", country: "INDIA" },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  await db.collection("onboarding_records").updateOne(
    { employeeId },
    {
      $set: {
        employeeId,
        currentStage: "ACTIVATION",
        status: "COMPLETED",
        completedStages: [
          "EMPLOYEE_INFORMATION",
          "EMPLOYMENT_DETAILS",
          "GEOGRAPHY",
          "BILLING_CLASSIFICATION",
          "DOCUMENTS",
          "HR_REVIEW"
        ],
        documentRequirements: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
}

describe("Integration Event Bus", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    registerEventListeners();
    app = getApp();
  });

  beforeEach(async () => {
    const db = getDb();
    await db.collection("timesheet_provisioning").deleteMany({ employeeId: "EMP-EVT-1" });
    await db.collection("notifications").deleteMany({ userId: "user_evt" });
  });

  describe("EmployeeActivated event", () => {
    it("activating an employee via lifecycle creates the activation notification", async () => {
      const db = getDb();
      await db.collection("users").deleteMany({ userId: "user_evt" });
      await db.collection("users").insertOne({
        userId: "user_evt",
        email: "event.tester@eniac.com",
        firstName: "Event",
        lastName: "Tester",
        role: "EMPLOYEE",
        status: "ACTIVE",
        employeeId: "EMP-EVT-1",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await seedEmployee("EMP-EVT-1");

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-EVT-1/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.employmentStatus).toBe("ACTIVE");

      const notification = await db
        .collection("notifications")
        .findOne({ userId: "user_evt", title: "Employee activated" });
      expect(notification).not.toBeNull();
      expect(notification?.message).toContain("Event Tester");
    });
  });

  describe("EmployeeTimesheetEligibilityChanged event", () => {
    it("activating a BILLABLE employee with completed onboarding provisions ELIGIBLE", async () => {
      const db = getDb();
      await seedEmployee("EMP-EVT-1");

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/employees/EMP-EVT-1/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.employmentStatus).toBe("ACTIVE");

      const provisioning = await db
        .collection("timesheet_provisioning")
        .findOne({ employeeId: "EMP-EVT-1" });
      expect(provisioning).not.toBeNull();
      expect(provisioning?.status).toBe("ELIGIBLE");
      expect(provisioning?.eligible).toBe(true);
    });

    it("activating a NON_BILLABLE employee provisions NOT_ELIGIBLE", async () => {
      const db = getDb();
      await seedEmployee("EMP-EVT-1");
      await db
        .collection("employees")
        .updateOne({ employeeId: "EMP-EVT-1" }, { $set: { billingStatus: "NON_BILLABLE" } });

      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/employees/EMP-EVT-1/activate")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const provisioning = await db
        .collection("timesheet_provisioning")
        .findOne({ employeeId: "EMP-EVT-1" });
      expect(provisioning?.status).toBe("NOT_ELIGIBLE");
      expect(provisioning?.eligible).toBe(false);
    });
  });

  describe("Listener failure policy", () => {
    it("publishing for an unknown employee resolves without throwing", async () => {
      await expect(
        integrationEvents.employeeTimesheetEligibilityChanged({
          employeeId: "EMP-DOES-NOT-EXIST",
          occurredAt: new Date()
        })
      ).resolves.toBeUndefined();
    });

    it("a failing listener is swallowed (publish still resolves)", async () => {
      const failing = async (): Promise<void> => {
        throw new Error("listener boom");
      };
      integrationEvents.on("EmployeeActivated", failing);
      try {
        await expect(
          integrationEvents.employeeActivated({
            employeeId: "EMP-EVT-1",
            employeeName: "Event Tester",
            occurredAt: new Date()
          })
        ).resolves.toBeUndefined();
      } finally {
        integrationEvents.off("EmployeeActivated", failing);
      }
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db.collection("employees").deleteMany({ employeeId: "EMP-EVT-1" });
    await db.collection("onboarding_records").deleteMany({ employeeId: "EMP-EVT-1" });
    await db.collection("timesheet_provisioning").deleteMany({ employeeId: "EMP-EVT-1" });
    await db.collection("notifications").deleteMany({ userId: "user_evt" });
    await db.collection("users").deleteMany({ userId: "user_evt" });
    await closeDatabase();
  });
});
