import { Role } from "../config/constants.js";
import type { AuditContext } from "../services/audit.service.js";

export interface AuthenticatedUser {
  userId: string;
  employeeId?: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
      auditContext?: AuditContext;
    }
  }
}

export {};
