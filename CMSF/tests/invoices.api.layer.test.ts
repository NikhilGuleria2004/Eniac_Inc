import { describe, it, expect, beforeEach } from "vitest";
import { createInvoice, getInvoice, sendInvoice } from "../src/data/invoices.api";
import { mockInvoices } from "../src/data/mock/index";

describe("invoices API layer in mock mode", () => {
  beforeEach(() => {
    mockInvoices.length = 0;
  });

  it("createInvoice and getInvoice work with mock store", async () => {
    const created = await createInvoice({
      clientId: "CL-001",
      subject: "Test",
      issueDate: "2026-01-01",
      dueDate: "2026-02-01",
      currency: "USD",
      paymentTerms: "NET_30",
      taxRate: 0,
      lineItems: [{ description: "Work", quantity: 1, rate: 100, amount: 100, manual: true, sortOrder: 0 }],
      timesheetIds: [],
    } as any);
    expect(created).toBeDefined();
    const fetched = await getInvoice(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it("sendInvoice transitions draft to sent in mock", async () => {
    const created = await createInvoice({
      clientId: "CL-001",
      subject: "Test",
      issueDate: "2026-01-01",
      dueDate: "2026-02-01",
      currency: "USD",
      paymentTerms: "NET_30",
      taxRate: 0,
      lineItems: [{ description: "Work", quantity: 1, rate: 100, amount: 100, manual: true, sortOrder: 0 }],
      timesheetIds: [],
    } as any);
    const sent = await sendInvoice(created.id, "test@example.com");
    expect(sent.status).toBe("SENT");
  });
});
