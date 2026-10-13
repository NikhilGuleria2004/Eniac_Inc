import type { Permission, Role } from "../types";
import { ROLE_PERMISSIONS } from "../data/constants";

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canViewSalary(role: Role): boolean {
  return hasPermission(role, "salary.view");
}

export function canViewBillRate(role: Role): boolean {
  return hasPermission(role, "billRate.view");
}

export function canViewAuditLog(role: Role): boolean {
  return hasPermission(role, "audit.view");
}

export function canManageSettings(role: Role): boolean {
  return hasPermission(role, "settings.manage");
}

export function canApproveLeave(role: Role): boolean {
  return hasPermission(role, "leave.approve");
}

export function canMarkAttendance(role: Role): boolean {
  return hasPermission(role, "attendance.mark");
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}

export function isHR(role: Role): boolean {
  return role === "HR";
}

export function isManager(role: Role): boolean {
  return role === "MANAGER";
}

export function isSupervisor(role: Role): boolean {
  return role === "SUPERVISOR";
}

export function isEmployee(role: Role): boolean {
  return role === "EMPLOYEE";
}
