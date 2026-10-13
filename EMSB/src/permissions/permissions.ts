import type { Role } from "../config/constants.js";

export const PERMISSIONS = [
  "employee.view",
  "employee.create",
  "employee.edit",
  "employee.delete",
  "employee.activate",
  "employee.view_salary",
  "employee.edit_salary",
  "employee.view_bill_rate",
  "employee.edit_bill_rate",
  "employee.view_operational",
  "profile.view_self",
  "profile.edit_self",
  "onboarding.manage",
  "document.view",
  "document.upload",
  "document.review",
  "document.view_self",
  "attendance.view",
  "attendance.mark",
  "attendance.correct",
  "attendance.review",
  "attendance.view_self",
  "leave.view",
  "leave.view_self",
  "leave.request",
  "leave.approve",
  "leave.reject",
  "client.view",
  "client.create",
  "client.edit",
  "project.view",
  "project.create",
  "project.edit",
  "project.view_self",
  "assignment.view",
  "assignment.create",
  "assignment.edit",
  "assignment.view_self",
  "review.view",
  "review.view_self",
  "review.create",
  "review.edit",
  "report.view",
  "audit.view",
  "settings.view",
  "settings.edit",
  "settings.manage",
  "timesheet.view",
  "timesheet.provision",
  "notification.view",
  "compensation.view",
  "compensation.manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ADMIN_PERMISSION = "*" as Permission;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [ADMIN_PERMISSION],
   HR: [
    "employee.view",
    "employee.create",
    "employee.edit",
    "employee.delete",
    "employee.activate",
    "employee.view_salary",
    "employee.edit_salary",
    "employee.view_bill_rate",
    "employee.edit_bill_rate",
    "employee.view_operational",
    "onboarding.manage",
    "document.view",
    "document.review",
    "document.view_self",
    "attendance.view",
    "attendance.mark",
    "attendance.correct",
    "attendance.review",
    "leave.view",
    "leave.approve",
    "leave.reject",
    "review.view",
    "review.create",
    "review.edit",
    "report.view",
    "compensation.view",
    "compensation.manage",
    "settings.view",
    "timesheet.view",
    "timesheet.provision",
    "notification.view"
  ],
   MANAGER: [
    "client.view",
    "client.create",
    "client.edit",
    "project.view",
    "project.create",
    "project.edit",
    "assignment.view",
    "assignment.create",
    "assignment.edit",
    "employee.view_operational",
    "attendance.view",
    "attendance.mark",
    "leave.view",
    "leave.approve",
    "leave.reject",
    "report.view",
    "timesheet.view",
    "notification.view"
  ],
  SUPERVISOR: [
    "project.view",
    "assignment.view",
    "assignment.create",
    "employee.view_operational",
    "project.view_self",
    "assignment.view_self",
    "attendance.view",
    "attendance.mark",
    "timesheet.view",
    "notification.view"
  ],
  EMPLOYEE: [
    "profile.view_self",
    "profile.edit_self",
    "attendance.mark",
    "attendance.view_self",
    "leave.view_self",
    "leave.request",
    "document.view_self",
    "document.upload",
    "project.view_self",
    "assignment.view_self",
    "review.view_self",
    "notification.view"
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes(ADMIN_PERMISSION)) return true;
  return perms.includes(permission);
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}
