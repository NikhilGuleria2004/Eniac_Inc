import pino from "pino";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV === "development";

const pinoOptions: pino.LoggerOptions & {
  transport?: { target: string; options: Record<string, unknown> };
} = {
  level: env.LOG_LEVEL,
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime
};

if (isDev) {
  pinoOptions.transport = {
    target: "pino-pretty",
    options: {
      translateTime: "UTC:yyyy-mm-dd HH:MM:ss",
      colorize: true,
      ignore: "hostname"
    }
  };
}

export const logger = pino(pinoOptions);
