import "dotenv/config";
import type { Request, Response } from "express";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { initializeIndexes } from "../src/config/init-db.js";
import { registerEventListeners } from "../src/integrations/event-listeners.js";

// Initialize once per cold start. Vercel caches the module between invocations,
// so connectDatabase(), initializeIndexes(), and createApp() all run only once.
await connectDatabase();
await initializeIndexes();
registerEventListeners();

const app = createApp();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
