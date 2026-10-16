import { Role } from "../config/constants.js";

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
    }
  }
}

export {};
