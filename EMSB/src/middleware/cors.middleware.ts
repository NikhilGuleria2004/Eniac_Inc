import cors from "cors";
import { env } from "../config/env.js";

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400
};

export const corsMiddleware = cors(corsOptions);
