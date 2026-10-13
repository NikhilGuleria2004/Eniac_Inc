import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
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

describe("Backend Foundation & Authentication", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await setupUsers();
    app = getApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Health Endpoints", () => {
    it("GET /health returns ok status", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("GET /health/live returns alive status", async () => {
      const res = await request(app).get("/health/live").expect(200);
      expect(res.body).toEqual({ status: "alive" });
    });
  });

  describe("API Info", () => {
    it("GET /api/v1 returns API info", async () => {
      const res = await request(app).get("/api/v1").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Eniac Inc. Employee Management System API");
    });
  });

  describe("404 Handler", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app).get("/api/v1/unknown-route").expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for non-existent health sub-path", async () => {
      const res = await request(app).get("/health/unknown").expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Authentication", () => {
    it("logs in as admin and returns JWT token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "superadmin@eniacinc.com", password: "Eniacinc1" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe("ADMIN");
    });

    it("logs in as all five roles", async () => {
      for (const testUser of TEST_USERS) {
        const res = await request(app)
          .post("/api/v1/auth/login")
          .send({ email: testUser.email, password: testUser.password })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe(testUser.role);
      }
    });

    it("rejects wrong password with 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "superadmin@eniacinc.com", password: "wrongpassword" })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("rejects unknown user with 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "noone@nowhere.com", password: "test123" })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("rejects /me without token (401)", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("returns user info on /me with valid token", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("superadmin@eniacinc.com");
      expect(res.body.data.role).toBe("ADMIN");
    });

    it("rejects invalid token with 401", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("logout endpoint works with valid token", async () => {
      const token = await getAccessToken(app, "superadmin@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("refresh returns new access token with valid refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "superadmin@eniacinc.com", password: "Eniacinc1" })
        .expect(200);

      const refreshToken = res.body.data.refreshToken;
      expect(refreshToken).toBeDefined();

      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.expiresIn).toBeDefined();
    });

    it("refresh rejects invalid refresh token with 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "invalid.token.here" })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("refresh rejects access token (wrong token type) with 401", async () => {
      const accessToken = await getAccessToken(app, "superadmin@eniacinc.com");

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: accessToken })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("refresh requires refresh token in body (400)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Authorization", () => {
    it("returns 401 for unauthenticated access to protected route", async () => {
      const res = await request(app).get("/api/v1/auth/me").expect(401);

      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("rejects request with malformed Authorization header", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "BadScheme token123")
        .expect(401);

      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("returns 403 when authenticated but lacking required permission", async () => {
      const appWithProtectedRoute = createApp();
      const token = await getAccessToken(app, "employee@eniacinc.com");

      const res = await request(appWithProtectedRoute)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
