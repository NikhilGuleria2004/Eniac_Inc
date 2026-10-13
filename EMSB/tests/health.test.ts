import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";

describe("Health Endpoints", () => {
  const app = createApp();

  it("GET /health returns ok status", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health/live returns alive status", async () => {
    const res = await request(app).get("/health/live").expect(200);

    expect(res.body).toEqual({ status: "alive" });
  });

  it("GET /health/ready returns 503 when DB not connected", async () => {
    const res = await request(app).get("/health/ready").expect(503);

    expect(res.body).toEqual({ status: "unavailable" });
  });
});

describe("API Info", () => {
  const app = createApp();

  it("GET /api/v1 returns API info", async () => {
    const res = await request(app).get("/api/v1").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Eniac Inc. Employee Management System API");
  });
});

describe("404 Handler", () => {
  const app = createApp();

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

describe("Environment Validation", () => {
  it("env is properly loaded", () => {
    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(4000);
    expect(env.MONGODB_DATABASE).toBe("eniac_ems_test");
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
