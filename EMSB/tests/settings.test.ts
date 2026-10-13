import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();

  await db.collection("users").deleteMany({});
  await db.collection("settings").deleteMany({});

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

describe("Phase 18 — Settings", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("GET /api/v1/settings", () => {
    it("ADMIN can get all settings", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.leave_types).toBeDefined();
      expect(res.body.data.organization).toBeDefined();
    });

    it("HR can view settings (view permission)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.leave_types).toBeDefined();
    });

    it("MANAGER cannot view settings (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("EMPLOYEE cannot view settings (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("unauthenticated request returns 401", async () => {
      await request(app)
        .get("/api/v1/settings")
        .expect(401);
    });

    it("supports category filter", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/settings?category=leave_types")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.leave_types).toBeDefined();
      expect(Object.keys(res.body.data).length).toBe(1);
    });
  });

  describe("PATCH /api/v1/settings", () => {
    it("ADMIN can update settings", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          settings: [
            {
              key: "organization_name",
              category: "organization",
              value: "Eniac Inc. Corp"
            }
          ]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].value).toBe("Eniac Inc. Corp");
    });

    it("HR cannot update settings (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          settings: [
            {
              key: "organization_name",
              category: "organization",
              value: "Changed"
            }
          ]
        })
        .expect(403);
    });

    it("EMPLOYEE cannot update settings (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          settings: [
            {
              key: "organization_name",
              category: "organization",
              value: "Changed"
            }
          ]
        })
        .expect(403);
    });

    it("unknown setting key returns 404", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          settings: [
            {
              key: "nonexistent_setting",
              category: "organization",
              value: "test"
            }
          ]
        })
        .expect(404);
    });

    it("missing settings array returns 400", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      await request(app)
        .patch("/api/v1/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({ foo: "bar" })
        .expect(400);
    });
  });
});
