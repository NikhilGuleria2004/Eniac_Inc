import { describe, it, expect } from "vitest";
import {
  createInvoice,
  sendInvoice,
  markPaidInvoice,
  voidInvoice,
  recordPartialPayment,
  getInvoiceById,
} from "../src/data/mock/repositories";

function newDraftInvoice() {
  return createInvoice({
    clientId: "CL-002",
    subject: "Consulting",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    currency: "USD",
    paymentTerms: "NET_30",
    taxRate: 0,
    lineItems: [{ description: "US Based Developer", quantity: 1, rate: 23400, amount: 23400, manual: true, sortOrder: 0 }],
    createdBy: "Admin",
  });
}

describe("invoice repository flow (integration)", () => {
  it("walks DRAFT → SENT → PAID and computes totals", () => {
    const inv = newDraftInvoice();
    expect(inv.status).toBe("DRAFT");
    expect(inv.subtotal).toBe(23400);
    expect(inv.balanceDue).toBe(23400);
    const sent = sendInvoice(inv.id, "Admin");
    expect(sent?.status).toBe("SENT");
    const paid = markPaidInvoice(inv.id);
    expect(paid?.status).toBe("PAID");
    expect(paid?.balanceDue).toBe(0);
    expect(getInvoiceById(inv.id)?.paidAt).toBeTruthy();
  });

  it("records a partial payment then settles", () => {
    const inv = newDraftInvoice();
    sendInvoice(inv.id, "Admin");
    const partial = recordPartialPayment(inv.id, 14000);
    expect(partial?.status).toBe("PARTIAL");
    expect(partial?.amountPaid).toBe(14000);
    expect(partial?.balanceDue).toBe(9400);
    const settled = recordPartialPayment(inv.id, 9400);
    expect(settled?.status).toBe("PAID");
    expect(settled?.balanceDue).toBe(0);
  });

  it("voids an invoice and blocks illegal moves", () => {
    const inv = newDraftInvoice();
    expect(voidInvoice(inv.id)?.status).toBe("VOID");
    expect(markPaidInvoice(inv.id)).toBeUndefined();
    const inv2 = newDraftInvoice();
    expect(markPaidInvoice(inv2.id)).toBeUndefined();
  });
});
