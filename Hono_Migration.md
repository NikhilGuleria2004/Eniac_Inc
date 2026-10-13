# Hono_Migration.md

**Project:** Eniac Inc. Employee Management System Backend
**Source:** `EMSB/` (Express + Node.js + TypeScript + MongoDB)
**Target:** Hono + Node.js + TypeScript + MongoDB
**Goal:** Migrate the entire backend from Express.js to Hono, preserving all existing business logic, routes, permissions, tests, and behavior. This document is the single source of truth — implement exactly what is described here.

---

## 0. What Is NOT Changing

The following files are **untouched** — they contain no Express/Node-HTTP dependencies and work as-is with Hono:

| Category | Files | Reason |
|---|---|---|
| **Config** | `src/config/env.ts`, `src/config/database.ts`, `src/config/constants.ts`, `src/config/init-db.ts` | Zod env validation, MongoDB connection, constants. No Express. |
| **Services** | `src/services/*.ts` (16 files) | Business logic using MongoDB driver directly. No Express `Request`/`Response` types. |
| **Repositories** | `src/repositories/*.ts` (~12 files) | Data access via MongoDB driver. No HTTP layer. |
| **Schemas** | `src/schemas/*.ts` (15 files) | Pure Zod validation schemas. No Express. |
| **Models** | `src/models/*.ts` (14 files) | TypeScript interfaces/types. No Express. |
| **Permissions** | `src/permissions/permissions.ts` | Role → permission matrix. Pure TS. |
| **Utils** | `src/utils/*.ts` (audit, dates, errors, jwt, notification-emitter, response, validation, request-context) | Utility functions. No Express. (`request-context.ts` uses `AsyncLocalStorage` — compatible with Hono on Node.) |
| **Integrations** | `src/integrations/events.ts`, `src/integrations/event-listeners.ts`, `src/integrations/mail/*`, `src/integrations/timesheet/*` | Event bus, mail adapters, timesheet adapter. No Express. |
| **OpenAPI** | `src/openapi.json` | Static API spec. Not touched, but can be regenerated later. |
| **Scripts** | `src/scripts/seed.ts`, `src/scripts/seed-dev.ts` | Seed scripts. These may reference the seed DB directly. |

> **Key insight:** The service, repository, schema, and model layers are already framework-agnostic. The migration is primarily at the **HTTP/routing/middleware layer** (server.ts, app.ts, middleware/, routes/, controllers/) and the **test layer** (tests/).

---

## 1. Dependency Changes (`package.json`)

### Remove (dependencies)
- `"express"`

### Remove (devDependencies)
- `"@types/express"`
- `"cors"`
- `"helmet"`
- `"express-rate-limit"`

### Add (dependencies)
- `"hono": "^4.0.0"`
- `"@hono/node-server": "^1.0.0"` (for local dev + Docker Node.js deployment)

### Add (devDependencies)
- `"@hono/testing": "^0.1.0"` (replaces `supertest` for tests)
- `"@types/node": "^20.14.2"` (already present, keep)

### Keep unchanged
- `"bcrypt"` — still used for password hashing on Node.js
- `"jsonwebtoken"` — still used for JWT signing/verification
- `"mongodb"` — unchanged
- `"zod"` — unchanged
- `"nodemailer"` — unchanged
- `"pino"`, `"pino-pretty"`, `"pino-http"` — keep pino logger; pino-http replaced by custom Hono middleware (see §5)
- `"uuid"` — unchanged
- `"dotenv"` — unchanged

### npm scripts (update)
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint . --ext .ts",
  "lint:fix": "eslint . --ext .ts --fix",
  "typecheck": "tsc --noEmit",
  "seed": "tsx src/scripts/seed.ts",
  "seed:dev": "tsx src/scripts/seed-dev.ts"
}
```

---

## 2. TypeScript Configuration (`tsconfig.json`)

**No changes required to compilerOptions** for a Node.js Hono deployment. The existing `tsconfig.json` in `EMSB/tsconfig.json` already has:
```json
"module": "NodeNext",
"moduleResolution": "NodeNext",
```

The `.js` import extensions (e.g., `../config/env.js`) are correct for `NodeNext` and remain valid. `@hono/node-server` is compatible with NodeNext ESM.

> If deploying to Cloudflare Workers later, switch to `"module": "esnext"` and use Hono's native edge exports — but this migration targets Node.js.

---

## 3. Type System: Express Augmentation → Hono Context Variables

### Delete: `src/types/express.d.ts`

The current file augments `Express.Request` with `user`, `requestId`, and `auditContext`. This is replaced by Hono's `ContextVariables`.

### Create: `src/types/context.ts`

```ts
import type { Role } from "../config/constants.js";
import type { JwtPayload } from "../utils/auth/jwt.js";
import type { AuditContext } from "../services/audit.service.js";
import type { RequestContext } from "../utils/request-context.js";

export interface AuthenticatedUser {
  userId: string;
  employeeId?: string;
  email: string;
  role: Role;
}

export interface ContextVariables {
  user?: AuthenticatedUser;
  requestId?: string;
  auditContext?: AuditContext;
  requestContext?: RequestContext;
}

export type { JwtPayload };
```

### Create: `src/app/context.ts` (Hono base type)

```ts
import type { Context } from "hono";
import type { ContextVariables } from "../types/context.js";

export type AppContext = Context<ContextVariables>;
```

> All handlers and middleware import `AppContext` from this file.

---

## 4. Server Entry Point (`src/server.ts`)

Replace the entire file. The new version uses `@hono/node-server`:

```ts
import "dotenv/config";
import { env } from "./config/env.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import { initializeIndexes } from "./config/init-db.js";
import { registerEventListeners } from "./integrations/event-listeners.js";
import { createApp } from "./app.js";
import { logger } from "./logger/logger.js";
import { serve } from "@hono/node-server";

const app = createApp();

async function start(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();
  registerEventListeners();

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info(`EMS Backend listening on http://localhost:${info.port}`);
    }
  );
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);
  await closeDatabase();
  logger.info("MongoDB connection closed");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
```

> The `@hono/node-server` `serve()` function wraps `app.fetch` — this is the Node.js adapter. For serverless/Vercel/Workers deployment, export `app` as the handler instead.

---

## 5. Application Factory (`src/app.ts`)

Rewrite `createApp()` to return a Hono instance.

### Current Express middleware → Hono equivalent:

| Express | Hono Replacement |
|---|---|
| `express.json({limit: "10mb"})` | `c.json()` is built-in; use `app.use(bodyLimit("10mb"))` or rely on default |
| `express.urlencoded(...)` | Hono has `c.req.formData()` — add only if needed |
| `requestIdMiddleware` | Custom Hono middleware (see §5.2) |
| `auditContextMiddleware` | Custom Hono middleware (see §5.3) |
| `securityHeaders` (helmet) | Custom Hono middleware (see §5.1) OR `hono/secure-headers` |
| `corsMiddleware` (cors) | `hono/cors` middleware |
| `httpLogger` (pino-http) | Custom Hono middleware (see §5.4) |
| `apiRateLimiter` (express-rate-limit) | Custom Hono middleware using `MongoRateLimitStore` (see §6.4) |
| `notFoundMiddleware` | Hono `app.notFound()` |
| `errorHandlerMiddleware` | Hono `app.onError()` |

### New `src/app.ts`:

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "@honojs/secure-headers"; // OR custom middleware
import type { ContextVariables } from "./types/context.js";
import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { auditContextMiddleware } from "./middleware/audit-context.middleware.js";
import { securityHeaders } from "./middleware/security.middleware.js";
import { httpLogger } from "./middleware/http-logger.middleware.js"; // renamed
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware.js"; // rewritten
import { apiRouter } from "./routes/index.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { API_BASE } from "./config/constants.js";

export function createApp(): Hono<ContextVariables> {
  const app = new Hono<ContextVariables>();

  // Middleware stack (order matters — same as Express)
  app.use("*", requestIdMiddleware);
  app.use("*", auditContextMiddleware);
  app.use("*", securityHeaders);
  app.use("*", cors({ origin: env.CORS_ORIGIN.split(","), credential: true }));
  app.use("*", httpLogger);
  app.use("/api/v1/*", rateLimitMiddleware);

  // Health endpoints
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/health/ready", async (c) => {
    try {
      const { getDb } = await import("./config/database.js");
      await getDb().command({ ping: 1 });
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  app.get("/health/live", (c) => c.json({ status: "alive" }));

  app.get("/api-docs", async (c) => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const specPath = join(process.cwd(), "src", "openapi.json");
    try {
      const spec = JSON.parse(readFileSync(specPath, "utf-8"));
      return c.json(spec);
    } catch {
      return c.json(
        { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "OpenAPI spec not found." } },
        500
      );
    }
  });

  // API routes
  app.route(API_BASE, apiRouter);

  // Fallback
  app.notFound(notFoundHandler);

  // Error handling
  app.onError(errorHandler);

  return app;
}
```

> **Note:** Hono middleware uses `app.use("*", ...)` for all paths. The order is top-to-bottom, matching Express's `app.use()` order.

---

## 6. Middleware Conversion (11 files)

### 6.1 `src/middleware/security.middleware.ts`

**Current:** Uses `helmet()`.
**New:** Replace with `hono/secure-headers` OR write a custom Hono middleware that sets the same headers:

```ts
import type { MiddlewareHandler } from "hono";
import { isProduction } from "../utils/response.js";
import { env } from "../config/env.js";

export const securityHeaders: MiddlewareHandler = (c, next) => {
  if (isProduction()) {
    c.header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'");
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  c.header("X-DNS-Prefetch-Control", "off");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  return next();
};
```

> Delete the `helmet` import. Do NOT install `hono/secure-headers` — write the custom middleware to match the existing header set.

### 6.2 `src/middleware/request-id.middleware.ts`

**Current:** Uses `req.headers["x-request-id"]`, `res.setHeader()`.
**New:**

```ts
import { v4 as uuidv4 } from "uuid";
import type { MiddlewareHandler } from "hono";

export const requestIdMiddleware: MiddlewareHandler<ContextVariables> = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? uuidv4();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
};
```

### 6.3 `src/middleware/audit-context.middleware.ts`

**Current:** Reads `req.requestId`, `req.ip`, `req.get("User-Agent")`, `req.user`.
**New:**

```ts
import { runRequestContext, type RequestContext } from "../utils/request-context.js";
import type { MiddlewareHandler } from "hono";

export const auditContextMiddleware: MiddlewareHandler<ContextVariables> = async (c, next) => {
  const user = c.get("user");
  const context: RequestContext = {
    requestId: c.get("requestId"),
    ipAddress: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown",
    userAgent: c.req.header("user-agent") ?? undefined,
  };

  c.set("auditContext", {
    ...context,
    userId: user?.userId,
    role: user?.role,
  });

  await runRequestContext(context, () => {
    // Hono middleware runs async; runRequestContext wraps the next() call
  });
  await next();
};
```

> **Important:** The `runRequestContext` wraps the request lifecycle in the AsyncLocalStorage. In Hono, call `runRequestContext` around `await next()`. Rewrite as:

```ts
export const auditContextMiddleware: MiddlewareHandler<ContextVariables> = async (c, next) => {
  const user = c.get("user");
  const context: RequestContext = {
    requestId: c.get("requestId"),
    ipAddress: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown",
    userAgent: c.req.header("user-agent") ?? undefined,
  };

  c.set("auditContext", {
    ...context,
    userId: user?.userId,
    role: user?.role,
  });

  await runRequestContext(context, async () => {
    await next();
  });
};
```

### 6.4 `src/middleware/auth.middleware.ts`

**Current:** Verifies JWT, sets `req.user = { userId, employeeId, email, role }`, calls `enrichRequestContext`.
**New:**

```ts
import type { Context } from "hono";
import { AuthenticationError } from "../utils/errors.js";
import { verifyToken, extractTokenFromHeader } from "../utils/auth/jwt.js";
import { enrichRequestContext } from "../utils/request-context.js";

export async function authenticate(c: Context, next: () => Promise<void>) {
  const token = extractTokenFromHeader(c.req.header("authorization"));

  if (!token) {
    throw new AuthenticationError("Access token is required.");
  }

  try {
    const payload = verifyToken(token);
    c.set("user", {
      userId: payload.userId,
      employeeId: payload.employeeId,
      email: payload.email,
      role: payload.role,
    });
    enrichRequestContext({ userId: payload.userId, role: payload.role });
    await next();
  } catch {
    throw new AuthenticationError("Invalid or expired token.");
  }
}
```

### 6.5 `src/middleware/authorization.middleware.ts`

**Current:** Express middleware `(req, res, next) => { if (!req.user) throw ...; check permission }`.
**New:** Convert to Hono middleware. The key change is `req.user` → `c.get("user")`:

```ts
import type { Context } from "hono";
import { AuthorizationError } from "../utils/errors.js";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "../permissions/permissions.js";
import type { Permission } from "../permissions/permissions.js";
import type { Role } from "../config/constants.js";

export function requirePermission(permission: Permission) {
  return async (c: Context, _next: () => Promise<void>) => {
    const user = c.get("user");
    if (!user) {
      throw new AuthorizationError("Authentication required.");
    }
    if (!hasPermission(user.role, permission)) {
      throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`);
    }
    await _next();
  };
}

export function requireAllPermissions(...permissions: Permission[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");
    if (!user) {
      throw new AuthorizationError("Authentication required.");
    }
    if (!hasAllPermissions(user.role, permissions)) {
      throw new AuthorizationError(`Insufficient permissions. Required: ${permissions.join(" and ")}`);
    }
    await next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");
    if (!user) {
      throw new AuthorizationError("Authentication required.");
    }
    if (!hasAnyPermission(user.role, permissions)) {
      throw new AuthorizationError(`Insufficient permissions. Required any of: ${permissions.join(" or ")}`);
    }
    await next();
  };
}

export function requireRole(...roles: Role[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");
    if (!user) {
      throw new AuthorizationError("Authentication required.");
    }
    if (!roles.includes(user.role)) {
      throw new AuthorizationError(`Insufficient role. Required one of: ${roles.join(" or ")}`);
    }
    await next();
  };
}
```

### 6.6 `src/middleware/error-handler.middleware.ts`

**Current:** `(error, req, res, next) => { ... res.status(...).json(...) }`.
**New:** Hono `onError` handler:

```ts
import type { ErrorHandler } from "hono";
import { AppError, ValidationError } from "../utils/errors.js";
import { errorResponse } from "../utils/response.js";
import { env } from "../config/env.js";
import { logger } from "../logger/logger.js";

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = c.get("requestId");
  const user = c.get("user");

  if (error instanceof ValidationError) {
    logger.warn({ requestId, userId: user?.userId, error: { ... } });
    return c.json(errorResponse(error.code, error.message, error.fields), error.statusCode);
  }

  if (error instanceof AppError) {
    logger.warn({ requestId, userId: user?.userId, error: { ... } });
    return c.json(errorResponse(error.code, error.message), error.statusCode);
  }

  if (error instanceof Error) {
    logger.error({ requestId, userId: user?.userId, error: { ... } });
    return c.json(
      errorResponse("INTERNAL_SERVER_ERROR", env.NODE_ENV === "development" ? error.message : "An unexpected error occurred."),
      500
    );
  }

  logger.error({ requestId, error: "Unknown error type" });
  return c.json(errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred."), 500);
};
```

### 6.7 `src/middleware/not-found.middleware.ts`

**Current:** Checks `req.baseUrl + req.path`.
**New:**

```ts
import type { NotFoundHandler } from "hono";
import { API_BASE } from "../config/constants.js";

export const notFoundHandler: NotFoundHandler = (c) => {
  const fullPath = API_BASE + c.req.path;
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${c.req.method} ${fullPath} not found.`,
      },
    },
    404
  );
};
```

### 6.8 `src/middleware/http-logger.middleware.ts` (NEW — replaces `pino-http`)

Create a new Hono middleware that replicates `pino-http`'s behavior (logging each request/response with timing):

```ts
import { logger } from "../logger/logger.js";
import type { MiddlewareHandler } from "hono";

export const httpLogger: MiddlewareHandler = async (c, next) => {
  const startTime = Date.now();
  await next();
  const durationMs = Date.now() - startTime;
  logger.info({
    requestId: c.get("requestId"),
    method: c.req.method,
    url: c.req.path,
    status: c.res?.status ?? 200,
    durationMs,
  });
};
```

> **Delete:** `src/middleware/rate-limit.middleware.ts` and `src/middleware/rate-limit.store.ts` are rewritten (see §6.4 + §6.9). The `pino-http` import and `http-logger.ts` file are deleted.

### 6.9 `src/middleware/rate-limit.middleware.ts`

**Current:** Uses `express-rate-limit` with `MongoRateLimitStore`.
**New:** Custom Hono middleware wrapping `MongoRateLimitStore` directly:

```ts
import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import { MongoRateLimitStore } from "./rate-limit.store.js";
import { API_BASE } from "../config/constants.js";

const apiStore = new MongoRateLimitStore();
const authStore = new MongoRateLimitStore();

// Initialize stores
apiStore.init({ windowMs: 15 * 60 * 1000 });
authStore.init({ windowMs: 15 * 60 * 1000 });

export const apiRateLimiter: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown-ip";
  const info = await apiStore.increment(key);
  if (info.totalHits > env.RATE_LIMIT_MAX) {
    return c.json({
      success: false,
      error: { code: "RATE_LIMIT_ERROR", message: "Too many requests." },
    }, 429);
  }
  c.header("RateLimit-Limit", String(env.RATE_LIMIT_MAX));
  c.header("RateLimit-Remaining", String(Math.max(0, env.RATE_LIMIT_MAX - info.totalHits)));
  await next();
};

export function authKeyGenerator(c: Context): string {
  const body = c.req.valid("json") as { email?: string } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown-ip";
  return email ? `${ip}|${email}` : ip;
}

export const authRateLimiter: MiddlewareHandler = async (c, next) => {
  // Read body for auth key generation — must consume before the route handler.
  // NOTE: Hono caches the JSON body, so this is safe to re-read in the handler.
  let body: unknown = undefined;
  try {
    body = await c.req.json().catch(() => undefined);
  } catch {
    // body is optional (e.g., GET requests)
  }

  const email = typeof (body as { email?: unknown })?.email === "string"
    ? (body as { email: string }).email.trim().toLowerCase()
    : "";
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown-ip";
  const key = email ? `${ip}|${email}` : ip;

  const info = await authStore.increment(key);
  if (info.totalHits > env.AUTH_RATE_LIMIT_MAX) {
    return c.json({
      success: false,
      error: { code: "RATE_LIMIT_ERROR", message: "Too many requests. Please try again later." },
    }, 429);
  }
  await next();
};
```

> **Important:** Express middleware reads `req.body` after parsing. In Hono, you must call `c.req.json()` to read the body, and Hono caches it so handlers can re-read it. For the auth rate limiter, the body needs to be read early — Hono's `c.req.json()` caches the result in `c.req`, so the route handler's `c.req.json()` will return the cached value.

### 6.10 `src/middleware/cors.middleware.ts`

**Delete this file.** CORS is now handled inline in `app.ts` via `hono/cors` (see §5).

### 6.11 `src/middleware/rate-limit.store.ts` — UNCHANGED

The `MongoRateLimitStore` class is **not modified**. It implements the rate-limit store methods directly and doesn't depend on Express. The rewritten Hono rate limiter middleware calls its methods directly (see §6.9).

---

## 7. Route Conversion (17 files)

All route files change from:
```ts
import { Router } from "express";
const router = Router();
router.use(authenticate);
router.get("/", requireAnyPermission(...), controller.method);
export default router;
```
to:
```ts
import { Hono } from "hono";
const router = new Hono<ContextVariables>();
router.use("*", authenticate);
router.get("/", requireAnyPermission(...), controller.method);
export default router;
```

### 7.1 `src/routes/index.ts` (router aggregator)

**Current:** Creates Express `Router()`, mounts sub-routers with `router.use("/path", subRouter)`.
**New:** Creates a Hono instance, mounts sub-appliers with `app.route("/path", subApp)`. Add the root info endpoint:

```ts
import { Hono } from "hono";
import type { ContextVariables } from "../types/context.js";
// ... all sub-router imports ...

const router = new Hono<ContextVariables>();

router.route("/auth", authRouter);
router.route("/employees", employeeRouter);
router.route("/onboarding", onboardingRouter);
router.route("/documents", documentRoutes);
router.route("/attendance", attendanceRoutes);
router.route("/leave", leaveRoutes);
router.route("/clients", clientRoutes);
router.route("/projects", projectRoutes);
router.route("/assignments", assignmentRoutes);
router.route("/reviews", reviewRoutes);
router.route("/notifications", notificationRoutes);
router.route("/audit-log", auditRoutes);
router.route("/dashboard", dashboardRoutes);
router.route("/reports", reportRoutes);
router.route("/settings", settingsRoutes);
router.route("/invitations", invitationRoutes);

router.get("/", (c) =>
  c.json({
    success: true,
    data: {
      name: "Eniac Inc. Employee Management System API",
      version: "1.0.0",
    },
  })
);

export default router;
```

### 7.2 Individual route files

Apply this pattern to **all 17 route files**. Key transformations:

| Express | Hono |
|---|---|
| `import { Router } from "express"` | `import { Hono } from "hono"` |
| `const router = Router()` | `const router = new Hono<ContextVariables>()` |
| `router.use(authenticate)` | `router.use("*", authenticate)` |
| `export default router` | `export default router` (unchanged) |
| `requireAnyPermission("perm")` | unchanged — now returns a Hono middleware function |
| `requirePermission("perm")` | unchanged |
| `requireRole("ADMIN")` | unchanged |

> **No changes** to the permission arrays, the controller method names, or the route paths. The middleware functions (`authenticate`, `requirePermission`, `requireAnyPermission`, `requireRole`) are rewritten in §6 to return Hono-compatible async functions, so route files need only change the Express → Hono import and the `router.use` syntax.

**Files to convert:**
1. `src/routes/auth.routes.ts` (13 lines)
2. `src/routes/employee.routes.ts` (124 lines)
3. `src/routes/onboarding.routes.ts` (24 lines)
4. `src/routes/document.routes.ts` (70 lines)
5. `src/routes/attendance.routes.ts` (64 lines)
6. `src/routes/leave.routes.ts` (55 lines)
7. `src/routes/client.routes.ts` (17 lines)
8. `src/routes/project.routes.ts` (56 lines)
9. `src/routes/assignment.routes.ts` (56 lines)
10. `src/routes/review.routes.ts` (56 lines)
11. `src/routes/notification.routes.ts` (34 lines)
12. `src/routes/audit.routes.ts` (22 lines)
13. `src/routes/dashboard.routes.ts` (22 lines)
14. `src/routes/report.routes.ts` (14 lines)
15. `src/routes/settings.routes.ts` (13 lines)
16. `src/routes/invitation.routes.ts` (11 lines)
17. `src/routes/index.ts` (48 lines, see §7.1)

**Route ordering rules** (preserved from Express): Within `employee.routes.ts`, `assignment.routes.ts`, `dashboard.routes.ts`, and `leave.routes.ts`, static paths (e.g., `/balances`, `/request`, `/check-in`) must be registered **before** param paths (`/:id`) so Hono routes them correctly. Hono handles this the same way as Express — order matters in the route stack.

---

## 8. Controller Conversion (18 files)

All 18 controllers follow the same pattern:
```ts
// EXPRESS
import type { Request, Response, NextFunction } from "express";
export const controller = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = schema.safeParse(req.query);
      // ...
      res.json(successResponse(data));
      // or: res.status(HTTP_STATUS.CREATED).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
};
```
→
```ts
// HONO
import type { Context } from "hono";
export const controller = {
  list: async (c: Context<ContextVariables>): Promise<Response> => {
    try {
      const result = schema.safeParse(c.req.query());
      // ...
      return c.json(successResponse(data));
      // or: return c.json(successResponse(data), HTTP_STATUS.CREATED);
    } catch (error) {
      throw error;  // Hono's onError handles it
    }
  }
};
```

### 8.1 Express API → Hono API Mapping (controller-level)

| Express | Hono |
|---|---|
| `req.params.id` | `c.req.param("id")` |
| `req.query` | `c.req.query()` |
| `req.body` | `await c.req.json()` |
| `req.user?.role` | `c.get("user")?.role` |
| `req.user?.employeeId` | `c.get("user")?.employeeId` |
| `req.user?.userId` | `c.get("user")?.userId` |
| `req.headers.authorization` | `c.req.header("authorization")` |
| `req.ip` | `c.req.header("cf-connecting-ip")` or `x-forwarded-for` |
| `req.get("User-Agent")` | `c.req.header("user-agent")` |
| `res.json(data)` | `c.json(data)` |
| `res.status(code).json(data)` | `c.json(data, code)` |
| `next(error)` | `throw error` |
| `req.body as { ... }` | `(await c.req.json()) as { ... }` |

### 8.2 Specific controller notes

**Auth controller** (`auth.controller.ts`): The `login` and `refresh` methods return `res.json(successResponse({...}))` with a 200 status. The `me` method returns `res.json(successResponse(user))`. Convert `req.body` → `await c.req.json()`. No `next(error)` — throw instead.

**Employee controller** (`employee.controller.ts`): The `update` method uses `req.user?.role` to select `hrEmployeeUpdateSchema` vs `employeeSelfUpdateSchema` vs `managerEmployeeUpdateSchema`. The `lifecycleAction` method reads `req.params.action`. All `req.params.employeeId` → `c.req.param("employeeId")`.

**Attendance controller** (`attendance.controller.ts`): Has `checkIn`, `checkOut`, `update`, `requestCorrection`, `reviewCorrection` methods. Query params via `c.req.query()`. Body via `await c.req.json()`.

**Document controller** (`document.controller.ts`): `req.body` → `await c.req.json()` for schema parsing.

**Onboarding controller** (`onboarding.controller.ts`): The `review` and `reject` methods destructure from `req.body as { reviewNotes?: string }` / `req.body as { rejectionReason?: string }`. Change to `(await c.req.json()) as {...}`.

**Invitation controller** (`invitation.controller.ts`): `req.params` is parsed with Zod (`invitationTokenParamSchema.safeParse(req.params)`). In Hono, params are accessed via `c.req.param()` returning an object. Use `c.req.param()` which returns an object of all params.

**Dashboard controller** (`dashboard.controller.ts`): `req.user?.employeeId` → `c.get("user")?.employeeId`, `req.user?.role` → `c.get("user")?.role`.

**Report controller** (`report.controller.ts`): `req.params.reportId` → `c.req.param("reportId")`. Has inline `reportQuerySchema` (not imported from schemas).

**Settings controller** (`settings.controller.ts`): `req.user?.role` → `c.get("user")?.role`, `req.user?.userId` → `c.get("user")?.userId`.

**Timesheet controller** (`timesheet.controller.ts`): Already minimal — `req.params.employeeId` → `c.req.param("employeeId")`, `req.user?.role` → `c.get("user")?.role`.

### 8.3 Files to convert

All 18 controllers:
1. `src/controllers/auth.controller.ts` (81 lines)
2. `src/controllers/employee.controller.ts` (169 lines)
3. `src/controllers/onboarding.controller.ts` (155 lines)
4. `src/controllers/document.controller.ts` (176 lines)
5. `src/controllers/attendance.controller.ts` (187 lines)
6. `src/controllers/leave.controller.ts` (135 lines)
7. `src/controllers/client.controller.ts` (97 lines)
8. `src/controllers/project.controller.ts` (132 lines)
9. `src/controllers/assignment.controller.ts` (131 lines)
10. `src/controllers/review.controller.ts` (118 lines)
11. `src/controllers/notification.controller.ts` (70 lines)
12. `src/controllers/audit.controller.ts` (45 lines)
13. `src/controllers/dashboard.controller.ts` (92 lines)
14. `src/controllers/report.controller.ts` (94 lines)
15. `src/controllers/settings.controller.ts` (65 lines)
16. `src/controllers/invitation.controller.ts` (78 lines)
17. `src/controllers/compensation.controller.ts` (78 lines)
18. `src/controllers/timesheet.controller.ts` (52 lines)

**Pattern for every controller:**
- Replace `import type { Request, Response, NextFunction } from "express"` → `import type { Context } from "hono"`
- Replace method signatures: `(req: Request, res: Response, next: NextFunction): Promise<void>` → `(c: Context<ContextVariables>): Promise<Response>`
- Replace `req.params.x` → `c.req.param("x")`
- Replace `req.query` → `c.req.query()`
- Replace `req.body` → `await c.req.json()` (note: body reads are async in Hono — must `await`)
- Replace `req.user?.x` → `c.get("user")?.x`
- Replace `res.json(data)` → `return c.json(data)`
- Replace `res.status(code).json(data)` → `return c.json(data, code)`
- Replace `req.body as {...}` → `(await c.req.json()) as {...}`
- Replace `c.req.param()` for object destructuring: `invitationTokenParamSchema.safeParse(req.params)` → `invitationTokenParamSchema.safeParse({ employeeId: c.req.param("employeeId"), token: c.req.param("token") })` (see specific note below)

**Special case — invitation routes param parsing:** The current code does `invitationTokenParamSchema.safeParse(req.params)` where `req.params = { token: "..." }`. In Hono, `c.req.param()` returns `{ token: "..." }`. So `invitationTokenParamSchema.safeParse(c.req.param())` works directly.

---

## 9. Request/Response Utilities (`src/utils/response.ts`)

**No changes needed.** The `successResponse()`, `paginatedResponse()`, and `errorResponse()` functions return plain JSON objects that work identically in Hono.

---

## 10. Error Classes (`src/utils/errors.ts`)

**No changes needed.** The `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `BusinessRuleError` classes are plain Error subclasses. Hono's `app.onError()` handler checks `instanceof` the same way.

---

## 11. JWT Utilities (`src/utils/auth/jwt.ts`)

**No changes needed.** Uses `bcrypt`, `jsonwebtoken`, and `env.JWT_SECRET`. These work in Node.js Hono runtime. The `extractTokenFromHeader` function takes a string header — works with `c.req.header("authorization")` (see §6.4).

---

## 12. Test Migration (23 test files)

### Testing strategy change

| Express + supertest | Hono + @hono/testing |
|---|---|
| `import request from "supertest"` | `import { testClient } from "hono/testing"` |
| `import { createApp } from "../src/app.js"` | `import { createApp } from "../src/app.js"` |
| `const app = createApp()` | `const app = createApp()` |
| `request(app).get("/path").send(...)` | `client.get.path.get(...)` or `client.api.v1.auth.login.post(...)` |

### Migration pattern

**Before (supertest):**
```ts
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();
const res = await request(app)
  .get("/api/v1/auth/login")
  .send({ email, password })
  .expect(200);
const token = res.body.data.accessToken;
```

**After (hono/testing):**
```ts
import { testClient } from "hono/testing";
import { createApp } from "../src/app.js";

const app = createApp();
const client = testClient(app);
const res = await client.api.v1.auth.login.post({
  json: { email, password },
});
expect(res.status).toBe(200);
const token = await res.json().then((d: any) => d.data.accessToken);
```

> `testClient(app)` generates a typed client from the Hono app. Routes like `/api/v1/auth/login` become `client.api.v1.auth.login`. The client is type-safe.

### Authentication in tests

Tests that need auth pass headers:
```ts
// supertest:
request(app).get("/api/v1/employees").set("Authorization", `Bearer ${token}`)

// hono/testing:
client.api.v1.employees.get({
  headers: { Authorization: `Bearer ${token}` }
});
```

### Health endpoints test

`health.test.ts` tests `/health`, `/health/live`, `/health/ready`, `/api/v1`, and 404. With `testClient`, these become path-chained calls. Note that `testClient` returns `Response` objects (not supertest `Response`), so assertions use `res.status` and `await res.json()` instead of `res.body`.

### Test files to convert (23 files)

1. `tests/auth.test.ts` — login/logout/me/refresh tests
2. `tests/employees.test.ts` — CRUD, search, lifecycle, compensation
3. `tests/onboarding.test.ts` — onboarding stages, approval, activation
4. `tests/documents.test.ts` — document CRUD, review, expiry
5. `tests/attendance.test.ts` — check-in/out, corrections, list
6. `tests/leave.test.ts` — leave requests, balances, approve/reject
7. `tests/clients.test.ts` — client CRUD, search
8. `tests/projects.test.ts` — project CRUD, status transitions
9. `tests/assignments.test.ts` — assignment CRUD, allocation
10. `tests/reviews.test.ts` — review CRUD, submit/complete
11. `tests/notifications.test.ts` — notification list, read, unread count
12. `tests/audit.test.ts` — audit log list, get-by-id
13. `tests/reports.test.ts` — report definitions, generation
14. `tests/settings.test.ts` — settings get/update
15. `tests/invitations.test.ts` — invitation accept, token validation
16. `tests/timesheet.test.ts` — eligibility, provision, status
17. `tests/dashboards.test.ts` — role-based dashboards
18. `tests/compensation.test.ts` — salary/bill rate CRUD, history
19. `tests/events.test.ts` — integration event listeners
20. `tests/health.test.ts` — health endpoints, 404, API info
21. `tests/database.test.ts` — database connection
22. `tests/security.test.ts` — security headers, CORS
23. `tests/rate-limit.test.ts` — rate limiting

### Test setup changes

**`tests/setup.ts`** — No changes needed. Sets env vars for test mode. The DB connection setup remains (MongoDB is still used directly).

**`tests/helpers/test-users.ts`** — No changes needed. Uses `hashPassword` and direct DB inserts. The `TEST_USERS` array and `setupTestUsers()` function are framework-agnostic.

### Common test conversion patterns

**Status assertions:**
```ts
// Before:
expect(res.status).toBe(200);
const data = res.body.data;

// After:
expect(res.status).toBe(200);
const data = (await res.json()).data;
```

**POST with body:**
```ts
// Before:
await request(app).post("/api/v1/leave/request").set("Authorization", `Bearer ${token}`).send({ ... });

// After:
await client.api.v1["leave"]["request"].post({ headers: { Authorization: `Bearer ${token}` }, json: { ... } });
```

**POST with URL params:**
```ts
// Before:
await request(app).post(`/api/v1/leave/${requestId}/approve`).set("Authorization", `Bearer ${token}`);

// After:
await client.api.v1.leave[`:requestId`].approve.post({ headers: { Authorization: `Bearer ${token}` } });
// OR use string templates:
await client.api.v1.leave[`:requestId`].approve.post({ headers: authHeaders });
```

> **Note on testClient parameter syntax:** For routes with params, use bracket notation: `client.api.v1.employees[":employeeId"].get({ headers: authHeaders })`.

---

## 13. OpenAPI Spec (`src/openapi.json`)

**No changes required** for the migration. The OpenAPI spec is a static JSON file served at `/api-docs`. After migration, you can regenerate it from Hono's schema-based routes (Hono has built-in OpenAPI support via `@hono/zod-openapi`), but the current static file remains valid as long as the API paths and methods are unchanged.

---

## 14. Scripts: `src/scripts/seed.ts` and `src/scripts/seed-dev.ts`

**No changes needed.** These scripts use the MongoDB driver and repository/service layers directly — no Express or HTTP types. They can run unchanged.

---

## 15. ESLint Configuration

Check `EMSB/.eslintrc.cjs` and `EMSB/tsconfig.eslint.json`. You may need to:

1. Add Hono-specific rules (e.g., `hono/no-deprecated` if using an ESLint plugin).
2. Remove Express-specific rules or globals.
3. Remove `@typescript-eslint` references to Express types.

> The existing ESLint config uses `@typescript-eslint`. Keep it. Add `"hono"` to the parser options if there are Hono-specific linting rules. Most likely no ESLint changes are needed beyond removing unused Express globals.

---

## 16. Docker & Deployment

### `Dockerfile` — No changes needed
The Dockerfile builds via `tsc` → `dist/`, then runs `node dist/server.js`. Since `@hono/node-server` runs on Node.js, the Docker flow is identical.

### `docker-compose.yml` — No changes needed
The compose file maps port 4000 and sets up MongoDB. Hono runs the same way.

### `docs/OPERATIONS.md` — Update
Update any references to Express-specific deployment notes (e.g., "Express.js" mentions). The health endpoints, CORS, logging, and monitoring sections remain accurate.

---

## 17. Migration Order (Step-by-Step)

Follow this order to ensure incremental compilation works:

| Step | Action | Files Affected |
|---|---|---|
| 1 | Install new deps, remove old deps (`npm install`) | `package.json` |
| 2 | Create `src/types/context.ts` and `src/app/context.ts` | 2 new files |
| 3 | Replace `src/types/express.d.ts` (delete it) | 1 file |
| 4 | Rewrite `src/middleware/` (all 11 files) | 11 files |
| 5 | Rewrite `src/routes/` (all 17 files + index) | 17 files |
| 6 | Rewrite `src/controllers/` (all 18 files) | 18 files |
| 7 | Rewrite `src/app.ts` (createApp factory) | 1 file |
| 8 | Rewrite `src/server.ts` (entry point) | 1 file |
| 9 | Delete `src/middleware/cors.middleware.ts` | 1 file |
| 10 | Delete `src/middleware/http-logger.ts` (renamed to `http-logger.middleware.ts`) | 1 file |
| 11 | Verify services/repositories have no Express imports (grep) | N/A (verification) |
| 12 | Run `npm run typecheck` — fix remaining type errors | As needed |
| 13 | Run `npm run lint` — fix lint errors | As needed |
| 14 | Convert test files (23 files) | 23+ files |
| 15 | Run `npm test` — verify all pass | N/A (verification) |
| 16 | Verify Docker build still works | N/A (verification) |

---

## 18. Gotchas & Edge Cases

1. **Body reading is async in Hono:** Express `req.body` is synchronous (pre-parsed). Hono's `c.req.json()` is async and must be `await`ed. In the auth rate limiter (§6.9), the body must be read **before** the route handler. Hono caches `c.req.json()` so the handler can re-read it without consuming the stream twice.

2. **`c.req.param()` returns an object:** In Express, `req.params` is an object. In Hono, `c.req.param()` returns an object of all params, and `c.req.param("id")` returns a single param. Use `c.req.param("id")` for single params, `c.req.param()` for the object.

3. **`req.ip` doesn't exist in Hono:** Hono doesn't provide `req.ip` by default. Use `c.req.header("cf-connecting-ip")` (Cloudflare) or `c.req.header("x-forwarded-ip")` or `c.req.header("x-forwarded-for")`. For local dev (no proxy), the IP will be undefined — the code already handles this with `?? "unknown-ip"` in the rate limiter.

4. **`res.setHeader` in Express → `c.header` in Hono:** The request ID middleware sets `X-Request-ID` response header. In Hono, use `c.header("X-Request-ID", requestId)`.

5. **`express.json()` body parsing:** Hono parses JSON bodies automatically via `c.req.json()`. For URL-encoded bodies, use `c.req.formData()` or a body-parsing middleware if needed. Current routes only use JSON, so no body-parser middleware is needed.

6. **Error propagation:** Express uses `next(error)` for error handling. Hono uses `throw` — errors propagate to `app.onError()`. Simply replace `next(error)` with `throw error` (or just let the error propagate by removing the try/catch and throwing directly).

7. **Route param naming:** Hono uses `:param` syntax (same as Express). No change to route definitions.

8. **`app.route()` vs mounting:** Hono's `app.route(prefix, subApp)` mounts a sub-application. The sub-routers are created with `new Hono()` instead of `Router()`. The API is otherwise identical (get/post/patch/delete with middleware).

9. **HTTP method on response:** Express `res.json(data)` sets status 200 by default. Hono `c.json(data)` also defaults to 200. `res.status(201).json(data)` → `c.json(data, 201)`.

10. **`@hono/node-server` `serve()`:** Returns a Node.js `http.Server` instance, compatible with the existing `shutdown()` logic in `server.ts`.

---

## 19. Verification Checklist

### Phase A: Dependencies & Build
- [ ] `package.json` updated: removed `express`, `cors`, `helmet`, `express-rate-limit`, `@types/express`; added `hono`, `@hono/node-server`
- [ ] `@hono/testing` added as devDependency
- [ ] `npm install` completes without errors
- [ ] `npm run build` (tsc) compiles with zero errors
- [ ] `npm run lint` passes with zero errors

### Phase B: Core Infrastructure
- [ ] `src/types/express.d.ts` deleted; `src/types/context.ts` created
- [ ] `src/app/context.ts` created with `AppContext` type
- [ ] `src/app.ts` — `createApp()` returns `Hono<ContextVariables>` with all middleware
- [ ] `src/server.ts` — uses `@hono/node-server` `serve()`, preserves health endpoints + signal handlers
- [ ] `src/middleware/request-id.middleware.ts` — Hono middleware, sets `X-Request-ID`
- [ ] `src/middleware/audit-context.middleware.ts` — Hono middleware, wraps `runRequestContext`
- [ ] `src/middleware/security.middleware.ts` — custom headers (no helmet)
- [ ] `src/middleware/auth.middleware.ts` — async Hono middleware, sets `c.set("user", ...)`
- [ ] `src/middleware/authorization.middleware.ts` — `requirePermission/requireAnyPermission/requireAllPermissions/requireRole` as Hono middlewares
- [ ] `src/middleware/error-handler.middleware.ts` — `ErrorHandler` for Hono `app.onError`
- [ ] `src/middleware/not-found.middleware.ts` — `NotFoundHandler` for Hono `app.notFound`
- [ ] `src/middleware/cors.middleware.ts` — DELETED (CORS in app.ts)
- [ ] `src/middleware/http-logger.middleware.ts` — NEW (replaces pino-http), `src/middleware/http-logger.ts` DELETED
- [ ] `src/middleware/rate-limit.middleware.ts` — rewritten as Hono middleware using `MongoRateLimitStore`
- [ ] `src/middleware/rate-limit.store.ts` — UNCHANGED
- [ ] `src/middleware/rate-limit.store.ts` — UNCHANGED

### Phase C: Routes
- [ ] `src/routes/index.ts` — Hono instance, `app.route()` for all 16 sub-routers, root info endpoint
- [ ] `src/routes/auth.routes.ts` — Hono, `router.use("*", authenticate)`
- [ ] `src/routes/employee.routes.ts` — Hono, all routes + route ordering preserved
- [ ] `src/routes/onboarding.routes.ts` — Hono
- [ ] `src/routes/document.routes.ts` — Hono, static paths before params (`/expired`, `/expiring-soon` before `/:documentId`)
- [ ] `src/routes/attendance.routes.ts` — Hono, static paths before params (`/check-in`, `/check-out`, `/corrections`, `/:attendanceId/...`)
- [ ] `src/routes/leave.routes.ts` — Hono, `/balances` and `/request` before `/:requestId`
- [ ] `src/routes/client.routes.ts` — Hono
- [ ] `src/routes/project.routes.ts` — Hono
- [ ] `src/routes/assignment.routes.ts` — Hono, `/employee/:employeeId/allocation` before `/:assignmentId`
- [ ] `src/routes/review.routes.ts` — Hano
- [ ] `src/routes/notification.routes.ts` — Hono, `/unread-count` and `/read-all` before `/:notificationId`
- [ ] `src/routes/audit.routes.ts` — Hono
- [ ] `src/routes/dashboard.routes.ts` — Hono
- [ ] `src/routes/report.routes.ts` — Hono
- [ ] `src/routes/settings.routes.ts` — Hono
- [ ] `src/routes/invitation.routes.ts` — Hono (no `authenticate` — public routes)

### Phase D: Controllers
- [ ] `src/controllers/auth.controller.ts` — `(c: Context)` signature, `c.req.json()`, `c.json()`, `c.get("user")`
- [ ] `src/controllers/employee.controller.ts` — all methods converted, role-based schema selection preserved
- [ ] `src/controllers/onboarding.controller.ts` — all methods converted, `review`/`reject` body destructuring
- [ ] `src/controllers/document.controller.ts` — all methods converted
- [ ] `src/controllers/attendance.controller.ts` — all methods converted
- [ ] `src/controllers/leave.controller.ts` — all methods converted
- [ ] `src/controllers/client.controller.ts` — all methods converted
- [ ] `src/controllers/project.controller.ts` — all methods converted
- [ ] `src/controllers/assignment.controller.ts` — all methods converted
- [ ] `src/controllers/review.controller.ts` — all methods converted
- [ ] `src/controllers/notification.controller.ts` — `req.user?.userId` → `c.get("user")?.userId`
- [ ] `src/controllers/audit.controller.ts` — all methods converted
- [ ] `src/controllers/dashboard.controller.ts` — role-based dashboard selection preserved
- [ ] `src/controllers/report.controller.ts` — inline schema preserved
- [ ] `src/controllers/settings.controller.ts` — `req.user?.role`/`userId` → `c.get("user")?.role`/`userId`
- [ ] `src/controllers/invitation.controller.ts` — `req.params` → `c.req.param()`, `req.user?.role` → `c.get("user")?.role`
- [ ] `src/controllers/compensation.controller.ts` — `req.query` → `c.req.query()`, `req.params` → `c.req.param()`
- [ ] `src/controllers/timesheet.controller.ts` — `req.params` → `c.req.param()`, `req.user?.role` → `c.get("user")?.role`

### Phase E: Tests
- [ ] Remove `supertest` import from all test files
- [ ] Add `import { testClient } from "hono/testing"` to all test files
- [ ] Convert all `request(app).get/post/patch/delete(...)` → `client.api.v1...` chained calls
- [ ] Convert `res.body` → `await res.json()`
- [ ] Convert `res.status` assertions → `res.status` (same)
- [ ] Convert `expect(res.body.data).toBe(...)` → `const data = (await res.json()).data` then `expect(data).toBe(...)`
- [ ] Convert auth headers: `.set("Authorization", ...)` → `{ headers: { Authorization: "Bearer ..." } }`
- [ ] Convert health tests
- [ ] Convert security tests (CSP/security headers — check via response headers)
- [ ] Convert rate-limit tests
- [ ] Convert database tests
- [ ] Convert events tests
- [ ] `npm test` — all 23 test files pass

### Phase F: Integration
- [ ] `npm run build` succeeds
- [ ] `npm run start` starts server on port 4000
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `GET /health/ready` works (with DB connected)
- [ ] `GET /api/v1` returns API info
- [ ] `POST /api/v1/auth/login` works with test users
- [ ] Authenticated `GET /api/v1/employees` works with Bearer token
- [ ] 404 handler works
- [ ] Error handler works (e.g., unauthorized → 401)
- [ ] CORS headers present on responses
- [ ] Security headers present
- [ ] Rate limiting works
- [ ] Docker build (`docker build`) succeeds
- [ ] `docs/OPERATIONS.md` updated (Express → Hono mentions)

---

## 17. Files Touched Summary

| Action | Count | Details |
|---|---|---|
| **Create** | 2 | `src/types/context.ts`, `src/app/context.ts` |
| **Create** | 1 | `src/middleware/http-logger.middleware.ts` |
| **Delete** | 3 | `src/types/express.d.ts`, `src/middleware/cors.middleware.ts`, `src/middleware/http-logger.ts` |
| **Rewrite** | 3 | `src/server.ts`, `src/app.ts`, `src/middleware/rate-limit.middleware.ts` |
| **Convert** | 11 | All other `src/middleware/*` files |
| **Convert** | 17 | All `src/routes/*` files |
| **Convert** | 18 | All `src/controllers/*` files |
| **Convert** | 23 | All `tests/*.test.ts` files |
| **Modify** | 1 | `package.json` (deps + scripts) |
| **Possibly modify** | 2 | `EMSB/.eslintrc.cjs`, `EMSB/tsconfig.eslint.json` |
| **Possibly modify** | 1 | `docs/OPERATIONS.md` |
| **Unchanged** | ~30+ | `src/services/*`, `src/repositories/*`, `src/schemas/*`, `src/models/*`, `src/permissions/*`, `src/utils/*`, `src/integrations/*`, `src/scripts/*`, `src/openapi.json`, `src/config/*`, `Dockerfile`, `docker-compose.yml` |

---

## 18. Quick Reference: Express vs Hono Code Patterns

```ts
// === Express (OLD) ===
import { Router, type Request, type Response, type NextFunction } from "express";
const router = Router();
router.use(authenticate);
router.get("/:id", requirePermission("employee.view"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = schema.safeParse(req.query);
    const data = await service.getById(req.params.id, req.user?.role);
    res.json(successResponse(data));
    // or: res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
});
export default router;

// === Hono (NEW) ===
import { Hono } from "hono";
import type { Context } from "hono";
import type { ContextVariables } from "../types/context.js";
const router = new Hono<ContextVariables>();
router.use("*", authenticate);
router.get("/:id", requirePermission("employee.view"), async (c: Context<ContextVariables>) => {
  const result = schema.safeParse(c.req.query());
  const data = await service.getById(c.req.param("id"), c.get("user")?.role);
  return c.json(successResponse(data));
  // or: return c.json(successResponse(data), 201);
  // errors: throw error (no try/catch needed, or keep try/catch with throw)
});
export default router;
```

---

## 19. Quick Reference: Middleware Conversion

```ts
// === Express middleware (OLD) ===
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) throw new AuthenticationError("...");
  req.user = { userId: payload.userId, ... };
  next();
}

// === Hono middleware (NEW) ===
export const authenticate = async (c: Context, next: () => Promise<void>) => {
  const token = extractTokenFromHeader(c.req.header("authorization"));
  if (!token) throw new AuthenticationError("...");
  c.set("user", { userId: payload.userId, ... });
  await next();
};

// === Express handler error flow (OLD) ===
catch (error) { next(error); }

// === Hono handler error flow (NEW) ===
// Option A (recommended — let it propagate):
//   no try/catch, just let errors bubble to app.onError()
// Option B (explicit throw):
catch (error) { throw error; }
```
