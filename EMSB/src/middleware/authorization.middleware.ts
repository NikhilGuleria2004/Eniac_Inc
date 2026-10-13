import type { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../utils/errors.js";
import type { Permission } from "../permissions/permissions.js";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "../permissions/permissions.js";
import type { Role } from "../config/constants.js";

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthorizationError("Authentication required.");
    }

    if (!hasPermission(req.user.role, permission)) {
      throw new AuthorizationError(
        `Insufficient permissions. Required: ${permission}`
      );
    }

    next();
  };
}

export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthorizationError("Authentication required.");
    }

    if (!hasAllPermissions(req.user.role, permissions)) {
      throw new AuthorizationError(
        `Insufficient permissions. Required: ${permissions.join(" and ")}`
      );
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthorizationError("Authentication required.");
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      throw new AuthorizationError(
        `Insufficient permissions. Required any of: ${permissions.join(" or ")}`
      );
    }

    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthorizationError("Authentication required.");
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Insufficient role. Required one of: ${roles.join(" or ")}`
      );
    }

    next();
  };
}
