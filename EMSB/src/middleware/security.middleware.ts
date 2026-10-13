import helmet from "helmet";
import { isProduction } from "../utils/response.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction()
    ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"]
        }
      }
    : false,
  hsts: isProduction()
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    : false
});
