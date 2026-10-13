import express from "express";
import type { Express } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { auditContextMiddleware } from "./middleware/audit-context.middleware.js";
import { securityHeaders } from "./middleware/security.middleware.js";
import { corsMiddleware } from "./middleware/cors.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { httpLogger } from "./logger/http-logger.js";
import apiRouter from "./routes/index.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.middleware.js";
import { API_BASE } from "./config/constants.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(requestIdMiddleware);
  app.use(auditContextMiddleware);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(httpLogger);
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      const { getDb } = await import("./config/database.js");
      await getDb().command({ ping: 1 });
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.get("/health/live", (_req, res) => {
    res.json({ status: "alive" });
  });

  app.get("/api-docs", (_req, res) => {
    const specPath = join(process.cwd(), "src", "openapi.json");
    try {
      const spec = JSON.parse(readFileSync(specPath, "utf-8"));
      res.json(spec);
    } catch {
      res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "OpenAPI spec not found." } });
    }
  });

  app.use(API_BASE, apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
