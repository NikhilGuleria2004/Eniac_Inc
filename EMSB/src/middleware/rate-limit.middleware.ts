import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env.js";
import { MongoRateLimitStore } from "./rate-limit.store.js";

/**
 * Separate store instances per limiter — express-rate-limit rejects a store
 * shared between two limiters. The MongoDB-backed store keeps counters shared
 * across restarts and instances; `passOnStoreError` lets requests through
 * (logged by the library) if the store is temporarily unavailable.
 */
const apiStore = new MongoRateLimitStore();
const authStore = new MongoRateLimitStore();

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_ERROR",
      message: "Too many requests."
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: apiStore,
  passOnStoreError: true
});

/**
 * Login attempts are limited per IP *and* per email so credential stuffing
 * against one account cannot be spread across IPs without hitting the limit.
 * Falls back to the IP alone when the request carries no email.
 */
export function authKeyGenerator(req: Request): string {
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const ip = req.ip ?? "unknown-ip";
  return email ? `${ip}|${email}` : ip;
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_ERROR",
      message: "Too many requests. Please try again later."
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: authStore,
  keyGenerator: authKeyGenerator,
  passOnStoreError: true
});
