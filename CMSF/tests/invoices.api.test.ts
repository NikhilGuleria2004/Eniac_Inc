import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("../src/lib/api", async () => {
  const actual: any = await vi.importActual("../src/lib/api");
  return {
    ...actual,
    USE_API: false,
  };
});

describe("invoices.api mock behavior", () => {
  beforeEach(() => {
    // clear mocks if any
    vi.clearAllMocks();
  });

  it("canInvoiceTransition rejects VOID->DRAFT and allows PARTIAL->PARTIAL per backend-aligned rules", async () => {
    const { canInvoiceTransition } = await import("../src/features/invoices/invoices");
    expect(canInvoiceTransition("VOID", "DRAFT")).toBe(false);
    expect(canInvoiceTransition("PARTIAL", "PARTIAL")).toBe(true);
  });
});
