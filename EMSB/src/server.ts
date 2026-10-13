import "dotenv/config";
import { env } from "./config/env.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import { initializeIndexes } from "./config/init-db.js";
import { registerEventListeners } from "./integrations/event-listeners.js";
import { createApp } from "./app.js";
import { logger } from "./logger/logger.js";

let server: import("http").Server | undefined;

async function start(): Promise<void> {
  await connectDatabase();
  await initializeIndexes();

  // Wire integration-event listeners (timesheet/notification side effects)
  // before serving traffic.
  registerEventListeners();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`EMS Backend listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
    });
  }

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
