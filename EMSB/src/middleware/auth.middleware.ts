import type { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "../utils/errors.js";
import { verifyToken, extractTokenFromHeader } from "../utils/auth/jwt.js";
import { enrichRequestContext } from "../utils/request-context.js";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    throw new AuthenticationError("Access token is required.");
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      employeeId: payload.employeeId,
      email: payload.email,
      role: payload.role
    };
    enrichRequestContext({ userId: payload.userId, role: payload.role });
    next();
  } catch {
    throw new AuthenticationError("Invalid or expired token.");
  }
}
