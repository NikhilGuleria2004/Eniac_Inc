import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { TEST_USERS, setupTestUsers } from "./helpers/test-users.js";

async function setupUsers() {
  const db = getDb();
  const employees = db.collection("employees");
  const reviews = db.collection("employee_reviews");

  await employees.deleteMany({});
  await reviews.deleteMany({});

  for (let i = 0; i < 5; i++) {
    await employees.updateOne(
      { employeeId: `EMP-${String(i + 1).padStart(3, "0")}` },
      {
        $set: {
          employeeId: `EMP-${String(i + 1).padStart(3, "0")}`,
          firstName: `Emp${i + 1}`,
          lastName: "User",
          email: `emp${i + 1}@test.com`,
          designation: "Engineer",
          department: "Engineering",
          country: "INDIA",
          employmentStatus: "ACTIVE",
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

describe("Phase 11 — Reviews", () => {
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
    await db.collection("employee_reviews").deleteMany({});
  });

  describe("POST /api/v1/reviews — Create", () => {
    it("HR can create a review (SCHEDULED)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({
          employeeId: "EMP-005",
          reviewerId: "EMP-002",
          reviewPeriod: "2024-Q1",
          rating: 4,
          strengths: "Strong skills",
          improvementAreas: "Communication",
          goals: "Improve presentation",
          comments: "Good work"
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe("EMP-005");
      expect(res.body.data.reviewerId).toBe("EMP-002");
      expect(res.body.data.status).toBe("SCHEDULED");
      expect(res.body.data.rating).toBe(4);
    });

    it("returns 404 if employee does not exist", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-NONEXISTENT", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 if reviewer does not exist", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-NONEXISTENT", reviewPeriod: "2024-Q1" })
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rejects rating out of range (400)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1", rating: 10 })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("EMPLOYEE cannot create reviews (403)", async () => {
      const token = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Review workflow", () => {
    async function createReview(app: Express, token: string): Promise<string> {
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1", rating: 4 });
      return res.body.data.reviewId;
    }

    it("submit: SCHEDULED → IN_PROGRESS", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const reviewId = await createReview(app, token);

      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("IN_PROGRESS");
    });

    it("complete: IN_PROGRESS → COMPLETED", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const reviewId = await createReview(app, token);

      await request(app)
        .post(`/api/v1/reviews/${reviewId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.status).toBe("COMPLETED");
    });

    it("full workflow: SCHEDULED → IN_PROGRESS → COMPLETED → ACKNOWLEDGED", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const reviewId = await createReview(app, token);

      await request(app)
        .post(`/api/v1/reviews/${reviewId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post(`/api/v1/reviews/${reviewId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "ACKNOWLEDGED" })
        .expect(200);

      expect(res.body.data.status).toBe("ACKNOWLEDGED");
      expect(res.body.data.acknowledgedAt).toBeDefined();
    });

    it("rejects invalid transition SCHEDULED → COMPLETED (422)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const reviewId = await createReview(app, token);

      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      expect(res.body.error.code).toBe("INVALID_REVIEW_TRANSITION");
    });

    it("EMPLOYEE cannot submit reviews (403)", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const reviewId = await createReview(app, token);

      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/submit`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(403);

      expect(res.body.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("GET /api/v1/reviews — List", () => {
    it("HR can list all reviews", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      const res = await request(app)
        .get("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("EMPLOYEE can only list own reviews", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ employeeId: "EMP-001", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      const empToken = await getAccessToken(app, "employee@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reviews")
        .set("Authorization", `Bearer ${empToken}`)
        .expect(200);

      res.body.data.forEach((r: { employeeId: string }) => {
        expect(r.employeeId).toBe("EMP-005");
      });
    });
  });

  describe("GET /api/v1/reviews/:reviewId — Detail", () => {
    it("EMPLOYEE can view own review", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1", rating: 5 })
        .expect(201);

      const reviewId = createRes.body.data.reviewId;
      const empToken = await getAccessToken(app, "employee@eniacinc.com");

      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(200);

      expect(res.body.data.reviewId).toBe(reviewId);
    });

    it("EMPLOYEE cannot view another's review (IDOR)", async () => {
      const hrToken = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ employeeId: "EMP-001", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      const reviewId = createRes.body.data.reviewId;
      const empToken = await getAccessToken(app, "employee@eniacinc.com");

      const res = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${empToken}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for non-existent review", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const res = await request(app)
        .get("/api/v1/reviews/REV-NONEXISTENT")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/reviews/:reviewId — Update", () => {
    it("HR can update review content", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      const reviewId = createRes.body.data.reviewId;

      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 3, comments: "Updated comments", strengths: "Updated strengths" })
        .expect(200);

      expect(res.body.data.rating).toBe(3);
      expect(res.body.data.comments).toBe("Updated comments");
    });
  });

  describe("Audit Logging", () => {
    it("audit logs are created for review actions", async () => {
      const token = await getAccessToken(app, "hreniac@eniacinc.com");
      const createRes = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ employeeId: "EMP-005", reviewerId: "EMP-002", reviewPeriod: "2024-Q1" })
        .expect(201);

      const reviewId = createRes.body.data.reviewId;

      await request(app)
        .post(`/api/v1/reviews/${reviewId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const db = getDb();
      const logs = await db.collection("audit_logs")
        .find({ entityType: "review" })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "review.created")).toBe(true);
      expect(logs.some((l) => l.action === "review.submitted")).toBe(true);
    });
  });
});
