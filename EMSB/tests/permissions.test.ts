import { describe, it, expect } from "vitest";
import { hasPermission } from "../src/permissions/permissions.js";
import type { Permission } from "../src/permissions/permissions.js";
import {
  TECH_ROLES,
  CLIENT_TIERS,
  CLIENT_STATUSES,
  PAYMENT_TERMS,
  TASK_CATEGORIES,
  TIMESHEET_STATUSES,
  INVOICE_STATUSES,
  CURRENCIES,
  PROJECT_TIERS,
} from "../src/config/constants.js";

const INVOICE_PERMS: Permission[] = ["invoice.view", "invoice.view_all", "invoice.create", "invoice.edit", "invoice.send"];

describe("CMS permissions (CMSB Phase 0)", () => {
  it("EMPLOYEE can log hours and submit timesheets", () => {
    expect(hasPermission("EMPLOYEE", "daily_log.create")).toBe(true);
    expect(hasPermission("EMPLOYEE", "daily_log.edit")).toBe(true);
    expect(hasPermission("EMPLOYEE", "timesheet.submit")).toBe(true);
    expect(hasPermission("EMPLOYEE", "timesheet.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "project.view")).toBe(true);
  });

  it("EMPLOYEE is blocked from invoices and reviewer powers", () => {
    for (const p of INVOICE_PERMS) expect(hasPermission("EMPLOYEE", p)).toBe(false);
    expect(hasPermission("EMPLOYEE", "timesheet.approve")).toBe(false);
    expect(hasPermission("EMPLOYEE", "daily_log.view_all")).toBe(false);
  });

  it("SUPERVISOR can review timesheets in scope but has no invoices", () => {
    expect(hasPermission("SUPERVISOR", "timesheet.approve")).toBe(true);
    expect(hasPermission("SUPERVISOR", "timesheet.reject")).toBe(true);
    expect(hasPermission("SUPERVISOR", "timesheet.view_all")).toBe(true);
    expect(hasPermission("SUPERVISOR", "daily_log.view_all")).toBe(true);
    for (const p of INVOICE_PERMS) expect(hasPermission("SUPERVISOR", p)).toBe(false);
  });

  it("MANAGER can review timesheets and manage invoices", () => {
    expect(hasPermission("MANAGER", "timesheet.approve")).toBe(true);
    expect(hasPermission("MANAGER", "daily_log.view_all")).toBe(true);
    expect(hasPermission("MANAGER", "invoice.create")).toBe(true);
    expect(hasPermission("MANAGER", "invoice.send")).toBe(true);
    expect(hasPermission("MANAGER", "invoice.view_all")).toBe(true);
  });

  it("HR has no CMS access", () => {
    expect(hasPermission("HR", "daily_log.view")).toBe(false);
    expect(hasPermission("HR", "invoice.view")).toBe(false);
    expect(hasPermission("HR", "timesheet.submit")).toBe(false);
    expect(hasPermission("HR", "daily_log.view_all")).toBe(false);
  });

  it("ADMIN has everything (via wildcard)", () => {
    expect(hasPermission("ADMIN", "invoice.send")).toBe(true);
    expect(hasPermission("ADMIN", "daily_log.view_all")).toBe(true);
    expect(hasPermission("ADMIN", "timesheet.approve")).toBe(true);
  });
});

describe("CMS enums (CMSB Phase 0)", () => {
  it("defines the CMS vocabulary", () => {
    expect(TECH_ROLES).toContain("DevOps Engineer");
    expect(CLIENT_TIERS).toContain("ENTERPRISE");
    expect(CLIENT_STATUSES).toContain("PROSPECT");
    expect(PAYMENT_TERMS).toContain("NET_30");
    expect(PAYMENT_TERMS).toContain("DUE_ON_RECEIPT");
    expect(TASK_CATEGORIES).toContain("DEVELOPMENT");
    expect(TIMESHEET_STATUSES).toContain("REVISED");
    expect(TIMESHEET_STATUSES).toContain("IN_REVIEW");
    expect(INVOICE_STATUSES).toContain("PARTIAL");
    expect(INVOICE_STATUSES).toContain("CANCELLED");
    expect(CURRENCIES).toContain("USD");
    expect(PROJECT_TIERS).toContain("ENTERPRISE");
  });
});
