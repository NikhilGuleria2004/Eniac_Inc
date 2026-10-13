import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Express, Request } from "express";
import { connectDatabase, closeDatabase, getDb } from "../src/config/database.js";
import { initializeIndexes } from "../src/config/init-db.js";
import { MongoRateLimitStore } from "../src/middleware/rate-limit.store.js";
import { authKeyGenerator, apiRateLimiter, authRateLimiter } from "../src/middleware/rate-limit.middleware.js";
import { env } from "../src/config/env.js";

const LOCAL_IPS = ["127.0.0.1", "::ffff:127.0.0.1", "::1"];

describe("Rate Limiting — shared store", () => {
  let app: Express;

  beforeAll(async () => {
    await connectDatabase();
    await initializeIndexes();
    app = createApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("MongoRateLimitStore", () => {
    it("increments hit counters per key across calls", async () => {
      const store = new MongoRateLimitStore();
      const key = "test:increment";
      await store.resetKey(key);

      const first = await store.increment(key);
      const second = await store.increment(key);

      expect(first.totalHits).toBe(1);
      expect(first.resetTime).toBeInstanceOf(Date);
      expect(second.totalHits).toBe(2);

      const info = await store.get(key);
      expect(info?.totalHits).toBe(2);
      expect(info?.resetTime).toBeInstanceOf(Date);

      await store.resetKey(key);
      expect(await store.get(key)).toBeUndefined();
    });

    it("starts a new window when the previous one elapses", async () => {
      const store = new MongoRateLimitStore();
      store.init({ windowMs: 50 });
      const key = "test:window";
      await store.resetKey(key);

      expect((await store.increment(key)).totalHits).toBe(1);
      expect((await store.increment(key)).totalHits).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 80));

      const afterWindow = await store.increment(key);
      expect(afterWindow.totalHits).toBe(1);
    });

    it("decrements hits and never lets them drop below one", async () => {
      const store = new MongoRateLimitStore();
      const key = "test:decrement";
      await store.resetKey(key);

      await store.increment(key);
      await store.increment(key);
      await store.decrement(key);
      expect((await store.get(key))?.totalHits).toBe(1);

      await store.decrement(key);
      expect((await store.get(key))?.totalHits).toBe(1);

      await store.resetKey(key);
    });

    it("declares keys as shared across instances (localKeys = false)", () => {
      const store = new MongoRateLimitStore();
      expect(store.localKeys).toBe(false);
    });
  });

  describe("authKeyGenerator", () => {
    it("combines IP with the lowercased email when present", () => {
      const req = { ip: "10.0.0.1", body: { email: "  User@Example.COM " } } as unknown as Request;
      expect(authKeyGenerator(req)).toBe("10.0.0.1|user@example.com");
    });

    it("falls back to the IP when the body has no usable email", () => {
      const req = { ip: "10.0.0.2", body: {} } as unknown as Request;
      expect(authKeyGenerator(req)).toBe("10.0.0.2");
    });

    it("falls back to the IP when the email is not a string", () => {
      const req = { ip: "10.0.0.3", body: { email: 42 } } as unknown as Request;
      expect(authKeyGenerator(req)).toBe("10.0.0.3");
    });
  });

  describe("Limiter configuration", () => {
    it("uses the configured limits from the environment", () => {
      expect(env.RATE_LIMIT_MAX).toBe(1000000);
      expect(env.AUTH_RATE_LIMIT_MAX).toBe(1000000);
      expect(apiRateLimiter).toBeDefined();
      expect(authRateLimiter).toBeDefined();
    });

    it("persists hit counters in the shared store and sets RateLimit headers", async () => {
      const db = getDb();

      const res = await request(app).get("/api/v1").expect(200);

      // Draft-6 RateLimit headers prove the limiter is active with the env limit.
      expect(res.headers["ratelimit-limit"]).toBe(String(env.RATE_LIMIT_MAX));

      // The counter lives in the shared MongoDB-backed store, keyed by client IP.
      const counter = await db
        .collection("rate_limits")
        .findOne({ key: { $in: LOCAL_IPS } });
      expect(counter).not.toBeNull();
      expect(counter?.hits).toBeGreaterThanOrEqual(1);
      expect(counter?.resetAt).toBeInstanceOf(Date);
    });
  });

  describe("rate_limits indexes", () => {
    it("has a unique key index and a TTL index on resetAt", async () => {
      const db = getDb();
      const indexes = await db.collection("rate_limits").listIndexes().toArray();

      const keyIndex = indexes.find((index) => index.key && "key" in index.key);
      expect(keyIndex?.unique).toBe(true);

      const ttlIndex = indexes.find((index) => index.key && "resetAt" in index.key);
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex?.expireAfterSeconds).toBe(0);
    });
  });
});
