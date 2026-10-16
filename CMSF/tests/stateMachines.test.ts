import { describe, it, expect } from "vitest";
import {
  canTransition,
  canSubmit,
  canApprove,
  canReject,
  canRevise,
  canMarkPaid,
  isOverdue,
} from "../src/features/timesheets/timesheets";
import { canInvoiceTransition, isInvoiceOverdue } from "../src/features/invoices/invoices";
import { hasPermission } from "../src/lib/permissions";
import type { Timesheet, Invoice } from "../src/types";

describe("timesheet state machine (§41)", () => {
  it("allows the happy path", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "IN_REVIEW")).toBe(true);
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "PAID")).toBe(true);
  });

  it("allows the reject → revise → resubmit recovery", () => {
    expect(canTransition("IN_REVIEW", "REJECTED")).toBe(true);
    expect(canTransition("REJECTED", "REVISED")).toBe(true);
    expect(canTransition("REVISED", "SUBMITTED")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("PAID", "SUBMITTED")).toBe(false);
    expect(canTransition("APPROVED", "REJECTED")).toBe(false);
  });

  it("phase guards match the transitions", () => {
    expect(canSubmit("DRAFT")).toBe(true);
    expect(canSubmit("REVISED")).toBe(true);
    expect(canSubmit("APPROVED")).toBe(false);
    expect(canApprove("IN_REVIEW")).toBe(true);
    expect(canReject("SUBMITTED")).toBe(true);
    expect(canRevise("REJECTED")).toBe(true);
    expect(canMarkPaid("APPROVED")).toBe(true);
  });

  it("flags overdue timesheets", () => {
    const past = { status: "SUBMITTED", periodEnd: "2020-01-01" } as unknown as Timesheet;
    const future = { status: "SUBMITTED", periodEnd: "2999-01-01" } as unknown as Timesheet;
    expect(isOverdue(past)).toBe(true);
    expect(isOverdue(future)).toBe(false);
  });
});

describe("invoice state machine (§42)", () => {
  it("allows draft → sent → paid and partial", () => {
    expect(canInvoiceTransition("DRAFT", "SENT")).toBe(true);
    expect(canInvoiceTransition("SENT", "OVERDUE")).toBe(true);
    expect(canInvoiceTransition("SENT", "PARTIAL")).toBe(true);
    expect(canInvoiceTransition("PARTIAL", "PAID")).toBe(true);
    expect(canInvoiceTransition("SENT", "PAID")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(canInvoiceTransition("PAID", "SENT")).toBe(false);
    expect(canInvoiceTransition("VOID", "PAID")).toBe(false);
  });

  it("flags overdue invoices by due date", () => {
    const past = { status: "SENT", dueDate: "2020-01-01" } as unknown as Invoice;
    expect(isInvoiceOverdue(past)).toBe(true);
    const draft = { status: "DRAFT", dueDate: "2020-01-01" } as unknown as Invoice;
    expect(isInvoiceOverdue(draft)).toBe(false);
  });
});

describe("permission matrix (§36)", () => {
  it("admin has everything, HR has nothing", () => {
    expect(hasPermission("ADMIN", "invoice.send")).toBe(true);
    expect(hasPermission("HR", "client.view")).toBe(false);
  });

  it("manager can review timesheets and audit but not manage settings", () => {
    expect(hasPermission("MANAGER", "timesheet.approve")).toBe(true);
    expect(hasPermission("MANAGER", "audit.view")).toBe(true);
    expect(hasPermission("MANAGER", "settings.manage")).toBe(false);
    expect(hasPermission("MANAGER", "invoice.create")).toBe(true);
  });

  it("employee is limited to own logs/timesheets", () => {
    expect(hasPermission("EMPLOYEE", "daily_log.create")).toBe(true);
    expect(hasPermission("EMPLOYEE", "timesheet.submit")).toBe(true);
    expect(hasPermission("EMPLOYEE", "invoice.view")).toBe(false);
    expect(hasPermission("EMPLOYEE", "assignment.view")).toBe(false);
  });
});
