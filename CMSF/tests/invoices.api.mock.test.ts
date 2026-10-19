import { describe, it, expect } from "vitest";
import { canInvoiceTransition } from "../src/features/invoices/invoices";

describe("invoices transition rules", () => {
  it("VOID is terminal (no VOID->DRAFT)", () => {
    expect(canInvoiceTransition("VOID", "DRAFT")).toBe(false);
  });

  it("PARTIAL can transition to PARTIAL", () => {
    expect(canInvoiceTransition("PARTIAL", "PARTIAL")).toBe(true);
  });
});
