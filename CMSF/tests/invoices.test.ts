import { describe, it, expect } from "vitest";
import { resolveResourceRate, techRoleToTier, geographyOf } from "../src/lib/rates";
import {
  computeInvoiceTotals,
  generateLineItemsFromTimesheets,
  nextInvoiceNumber,
  dueDateFromTerms,
} from "../src/features/invoices/invoices";
import type { Employee, Timesheet } from "../src/types";

function ts(employeeId: string, breakdown: { projectId: string; projectName: string }[] = []): Timesheet {
  return {
    id: `t-${employeeId}`,
    employeeId,
    status: "APPROVED",
    projectBreakdown: breakdown.map((b) => ({ ...b, employeeBillRate: 0, billableHours: 80, billableAmount: 0 })),
  } as unknown as Timesheet;
}
function emp(id: string, country: string, techRole: string): Employee {
  return { id, country, techRole, designation: "", billingStatus: "BILLABLE" } as unknown as Employee;
}

describe("resource rates", () => {
  it("maps geography", () => {
    expect(geographyOf("United States")).toBe("US Based");
    expect(geographyOf("India")).toBe("India-Based");
    expect(geographyOf("Germany")).toBe("EU Based");
  });

  it("collapses roles into tiers and reproduces PDF rates", () => {
    expect(techRoleToTier("AEM Developer")).toBe("Developer");
    expect(resolveResourceRate({ country: "United States", techRole: "AEM Developer", designation: "" })).toBe(23400);
    expect(resolveResourceRate({ country: "India", techRole: "DevOps Engineer", designation: "" })).toBe(11000);
    expect(resolveResourceRate({ country: "United Kingdom", techRole: "Java Developer", designation: "" })).toBe(20584);
  });
});

describe("invoice totals", () => {
  it("computes subtotal, tax and total", () => {
    const lineItems = [
      { amount: 23400 },
      { amount: 20584 },
      { amount: 6240 },
    ] as Parameters<typeof computeInvoiceTotals>[0];
    const t = computeInvoiceTotals(lineItems, 0);
    expect(t.subtotal).toBe(50224);
    expect(t.taxAmount).toBe(0);
    expect(t.totalAmount).toBe(50224);
  });

  it("applies a percentage tax", () => {
    const lineItems = [{ amount: 100 }] as Parameters<typeof computeInvoiceTotals>[0];
    const t = computeInvoiceTotals(lineItems, 0.1);
    expect(t.taxAmount).toBe(10);
    expect(t.totalAmount).toBe(110);
  });
});

describe("line item generation from timesheets", () => {
  it("groups by resource type and suffixes duplicates", () => {
    const employees = [
      emp("e1", "United States", "AEM Developer"),
      emp("e2", "India", "AEM Developer"),
      emp("e3", "India", "AEM Developer"),
    ];
    const timesheets = [
      ts("e1", [{ projectId: "P1", projectName: "Project Alpha" }]),
      ts("e2", [{ projectId: "P2", projectName: "Project Beta" }]),
      ts("e3", [{ projectId: "P3", projectName: "Project Gamma" }]),
    ];
    const items = generateLineItemsFromTimesheets(timesheets, employees);
    const descs = items.map((i) => i.description).sort();
    expect(descs).toEqual(["India-Based AEM Developer #1", "India-Based AEM Developer #2", "US Based AEM Developer"]);
    expect(items.every((i) => i.quantity === 1 && i.amount === i.rate)).toBe(true);
    expect(items.find((i) => i.description === "US Based AEM Developer")?.rate).toBe(23400);
    expect(items.find((i) => i.description.startsWith("India-Based AEM"))?.rate).toBe(6240);
  });
});

describe("invoice helpers", () => {
  it("generates the next sequential invoice number", () => {
    const year = new Date().getFullYear();
    expect(nextInvoiceNumber([])).toBe(`INV-${year}-001`);
    expect(nextInvoiceNumber([{ invoiceNumber: "INV-2026-009" } as never])).toBe(`INV-${year}-010`);
  });

  it("computes a due date from terms", () => {
    expect(dueDateFromTerms("2026-07-01", "NET_30")).toBe("2026-07-31");
    expect(dueDateFromTerms("2026-07-01", "DUE_ON_RECEIPT")).toBe("2026-07-01");
  });
});
