import type { Invoice, InvoiceLineItem, InvoiceStatus, Timesheet, Employee, Client } from "../../types";
import { geographyOf, resolveResourceRate } from "../../lib/rates";

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "VOID", "PARTIAL"],
  OVERDUE: ["PAID", "VOID", "PARTIAL"],
  PARTIAL: ["PAID", "OVERDUE"],
  PAID: [],
  VOID: ["DRAFT"],
  CANCELLED: [],
};

export function canInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isInvoiceOverdue(inv: Invoice): boolean {
  if (inv.status !== "SENT" && inv.status !== "PARTIAL") return false;
  return inv.dueDate < todayIso();
}

export function computeInvoiceTotals(lineItems: InvoiceLineItem[], taxRate: number) {
  const subtotal = Number(lineItems.reduce((s, li) => s + li.amount, 0).toFixed(2));
  const taxAmount = Number((subtotal * taxRate).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  return { subtotal, taxAmount, totalAmount };
}

export function resourceNameOf(emp: { country: string; techRole?: string; designation: string; firstName: string; lastName: string }): string {
  const role = emp.techRole ?? emp.designation;
  return `${emp.firstName} ${emp.lastName} — ${geographyOf(emp.country)} ${role}`;
}

export function generateLineItemsFromTimesheets(timesheets: Timesheet[], employees: Employee[]): InvoiceLineItem[] {
  const groups = new Map<string, { rate: number; count: number; employeeId: string; employeeName: string; projectId: string; projectName: string }>();
  for (const ts of timesheets) {
    const emp = employees.find((e) => e.id === ts.employeeId);
    if (!emp) continue;
    for (const pb of ts.projectBreakdown) {
      const role = emp.techRole ?? emp.designation;
      const name = `${geographyOf(emp.country)} ${role}`;
      const rate = resolveResourceRate(emp) ?? 0;
      const key = name;
      const g = groups.get(key);
      if (g) g.count += 1;
      else groups.set(key, {
        rate,
        count: 1,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        projectId: pb.projectId,
        projectName: pb.projectName,
      });
    }
  }

  const lineItems: InvoiceLineItem[] = [];
  let sortOrder = 0;
  for (const [name, g] of groups) {
    for (let i = 0; i < g.count; i++) {
      const desc = g.count > 1 ? `${name} #${i + 1}` : name;
      lineItems.push({
        id: `LI-${Date.now()}-${sortOrder}`,
        description: desc,
        quantity: 1,
        rate: g.rate,
        amount: g.rate,
        employeeId: g.employeeId,
        employeeName: g.employeeName,
        projectId: g.projectId,
        projectName: g.projectName,
        manual: false,
        sortOrder: sortOrder++,
      });
    }
  }
  return lineItems;
}

export function nextInvoiceNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const inv of existing) {
    const n = Number(inv.invoiceNumber.replace(/\D/g, "").slice(-3));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `INV-${year}-${String(max + 1).padStart(3, "0")}`;
}

export interface InvoiceKPIs {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  void: number;
  totalBilled: number;
}

export function computeInvoiceKPIs(invoices: Invoice[]): InvoiceKPIs {
  return {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === "DRAFT").length,
    sent: invoices.filter((i) => i.status === "SENT").length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    overdue: invoices.filter(isInvoiceOverdue).length,
    void: invoices.filter((i) => i.status === "VOID" || i.status === "CANCELLED").length,
    totalBilled: invoices
      .filter((i) => i.status !== "DRAFT" && i.status !== "VOID" && i.status !== "CANCELLED")
      .reduce((s, i) => s + i.totalAmount, 0),
  };
}

export interface InvoiceFilters {
  search: string;
  client: string;
  status: string;
  po: string;
}

export function filterInvoices(invoices: Invoice[], filters: InvoiceFilters): Invoice[] {
  const q = filters.search.trim().toLowerCase();
  return invoices.filter((inv) => {
    if (filters.client !== "all" && inv.clientId !== filters.client) return false;
    if (filters.status !== "all" && inv.status !== filters.status) return false;
    if (filters.po && !(inv.poNumber ?? "").toLowerCase().includes(filters.po.toLowerCase())) return false;
    if (q && !`${inv.invoiceNumber} ${inv.clientName} ${inv.status} ${inv.totalAmount}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function dueDateFromTerms(issueDate: string, terms: Invoice["paymentTerms"]): string {
  const days = terms === "NET_15" ? 15 : terms === "NET_30" ? 30 : terms === "NET_45" ? 45 : terms === "NET_60" ? 60 : 0;
  const d = new Date(`${issueDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function clientLabel(client: Client | undefined): string {
  return client ? `${client.name} (${client.clientCode})` : "";
}

export function formatInvoiceDate(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
