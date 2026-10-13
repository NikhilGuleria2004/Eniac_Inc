import type pino from "pino";
import * as pinoHttpModule from "pino-http";
import { logger } from "./logger.js";

const pinoHttp = (pinoHttpModule as unknown as {
  default: (opts: { logger: pino.Logger; level: string; autoLogging: boolean; redactions?: string[]; customLogLevel?: (status: number) => string }) => (req: unknown, res: unknown, next?: () => void) => void;
}).default;

export const httpLogger = pinoHttp({
  logger,
  level: logger.level,
  autoLogging: true,
  redactions: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "req.body.hashedPassword", "res.body.data.hashedPassword"]
});
