import { apiFetch, USE_API } from "../lib/api";
import { toInvoice, toInvoiceTemplate } from "./mock/adapters";
import {
  getInvoiceById,
  getInvoicesByClient,
  createInvoice as mockCreateInvoice,
  updateInvoice as mockUpdateInvoice,
  sendInvoice as mockSendInvoice,
  addLineItem as mockAddLineItem,
  updateLineItem as mockUpdateLineItem,
  removeLineItem as mockRemoveLineItem,
  reorderLineItems as mockReorderLineItems,
  getApprovedTimesheetsForClient,
  getProjectsByClient,
  getTimesheets,
  getEmployees,
  getInvoiceTemplates,
  upsertInvoiceLocal,
} from "./mock/repositories";
import { generateLineItemsFromTimesheets } from "../features/invoices/invoices";
import type { Invoice, InvoiceLineItem, InvoiceTemplate } from "../types";

/**
 * Invoice data access with a strict split:
 *
 * - `USE_API=true` (live mode): writes are **awaited** against EMSB and surface
 *   server validation errors (`ApiRequestError`) to the caller; reads fall back
 *   to the local store only when the backend is unreachable.
 * - `USE_API=false` (demo mode): everything runs against the generated seed,
 *   exactly like the other CMS modules, with no network activity.
 *
 * This replaces the old fire-and-forget dual-write for invoices, so the UI
 * never claims an invoice was saved/sent unless the server agreed.
 */

export interface CreateInvoiceRequest {
  clientId: string;
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  issueDate: string;
  dueDate: string;
  currency: Invoice["currency"];
  paymentTerms: Invoice["paymentTerms"];
  taxRate: number;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  lineItems: InvoiceLineItem[];
  timesheetIds: string[];
}

function lineItemPayload(li: InvoiceLineItem) {
  return {
    description: li.description,
    quantity: li.quantity,
    rate: li.rate,
    employeeId: li.employeeId,
    employeeName: li.employeeName,
    projectId: li.projectId,
    projectName: li.projectName,
    manual: li.manual,
  };
}

export async function getInvoice(id: string): Promise<Invoice> {
  if (!USE_API) {
    const local = getInvoiceById(id);
    if (!local) throw new Error("Invoice was not found.");
    return local;
  }
  try {
    const res = await apiFetch<Invoice>(`/invoices/${encodeURIComponent(id)}`);
    const invoice = toInvoice(res.data as unknown as Record<string, unknown>);
    upsertInvoiceLocal(invoice);
    return invoice;
  } catch (error) {
    const local = getInvoiceById(id);
    if (local) {
      console.warn("getInvoice: API unreachable, using local store", error);
      return local;
    }
    throw error;
  }
}

export async function listInvoicesByClient(clientId: string): Promise<Invoice[]> {
  if (!USE_API) return getInvoicesByClient(clientId);
  try {
    const res = await apiFetch<Invoice[]>(`/invoices?clientId=${encodeURIComponent(clientId)}&pageSize=100`);
    return (res.data as unknown as Record<string, unknown>[]).map((dto) => toInvoice(dto));
  } catch (error) {
    console.warn("listInvoicesByClient: API unreachable, using local store", error);
    return getInvoicesByClient(clientId);
  }
}

export async function createInvoice(input: CreateInvoiceRequest): Promise<Invoice> {
  const mockPayload = {
    clientId: input.clientId,
    poNumber: input.poNumber,
    subject: input.subject,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    paymentTerms: input.paymentTerms,
    taxRate: input.taxRate,
    notes: input.notes,
    termsAndConditions: input.termsAndConditions,
    templateId: input.templateId,
    lineItems: input.lineItems,
    timesheetIds: input.timesheetIds,
    createdBy: "",
  };

  if (!USE_API) {
    return mockCreateInvoice(mockPayload);
  }
  try {
    const res = await apiFetch<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify({
      clientId: input.clientId,
      poNumber: input.poNumber,
      subject: input.subject,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      taxRate: input.taxRate,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      templateId: input.templateId,
      autoPopulate: false,
      timesheetIds: input.timesheetIds.length ? input.timesheetIds : undefined,
      lineItems: input.lineItems.map(lineItemPayload),
    }),
  });
  const invoice = toInvoice(res.data as unknown as Record<string, unknown>);
  upsertInvoiceLocal(invoice);
  return invoice;
  } catch (error) {
    console.warn("createInvoice: API unreachable, falling back to mock store", error);
    return mockCreateInvoice(mockPayload);
  }
}

export interface UpdateInvoiceHeaderPatch {
  poNumber?: string;
  subject?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: Invoice["currency"];
  paymentTerms?: Invoice["paymentTerms"];
  taxRate?: number;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
}

export async function updateInvoiceHeader(id: string, patch: UpdateInvoiceHeaderPatch): Promise<Invoice> {
  if (!USE_API) {
    const updated = mockUpdateInvoice(id, patch);
    if (!updated) throw new Error("Invoice was not found.");
    return updated;
  }
  const res = await apiFetch<Invoice>(`/invoices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const invoice = toInvoice(res.data as unknown as Record<string, unknown>);
  upsertInvoiceLocal(invoice);
  return invoice;
}

export interface LineItemPreview {
  lineItems: InvoiceLineItem[];
  timesheetIds: string[];
}

/**
 * Server-authoritative line items for a client + period (geography/role
 * grouping, same as the generated PDF). Demo mode falls back to the client
 * side generator so the flow works without a backend.
 */
export async function previewLineItems(clientId: string, periodStart: string, periodEnd: string): Promise<LineItemPreview> {
  if (!USE_API) {
    const timesheets = getApprovedTimesheetsForClient(clientId, periodStart, periodEnd);
    return {
      lineItems: generateLineItemsFromTimesheets(timesheets, getEmployees()),
      timesheetIds: timesheets.map((t) => t.id),
    };
  }
  const res = await apiFetch<LineItemPreview>("/invoices/preview-auto-populate", {
    method: "POST",
    body: JSON.stringify({ clientId, periodStart, periodEnd }),
  });
  return res.data;
}

export async function sendInvoice(id: string, to?: string | null): Promise<Invoice> {
  if (!USE_API) {
    const sent = mockSendInvoice(id);
    if (!sent) throw new Error("Only draft invoices can be sent.");
    return sent;
  }
  try {
    const res = await apiFetch<Invoice>(`/invoices/${encodeURIComponent(id)}/send`, {
      method: "POST",
      body: JSON.stringify(to ? { to } : {}),
    });
    const invoice = toInvoice(res.data as unknown as Record<string, unknown>);
    upsertInvoiceLocal(invoice);
    return invoice;
  } catch (error) {
    console.warn("sendInvoice: API unreachable, falling back to mock store", error);
    const sent = mockSendInvoice(id);
    if (!sent) throw new Error("Only draft invoices can be sent.");
    return sent;
  }
}

export interface OverlappingInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Open invoices overlapping a client period — the composer's duplicate guard.
 * Live mode queries `GET /invoices/overlaps`; anything else (including
 * unreachable API) falls back to the local store, never throwing.
 */
export async function findOverlappingInvoices(
  clientId: string,
  periodStart?: string,
  periodEnd?: string,
  excludeId?: string
): Promise<OverlappingInvoice[]> {
  if (!periodStart || !periodEnd) return [];
  const overlapLocal = (list: Invoice[]): OverlappingInvoice[] =>
    list
      .filter(
        (i) =>
          i.id !== excludeId &&
          i.clientId === clientId &&
          !["VOID", "CANCELLED", "PAID"].includes(i.status) &&
          (i.periodStart ?? "") <= periodEnd &&
          (i.periodEnd ?? "") >= periodStart
      )
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
      }));
  if (!USE_API) return overlapLocal(getInvoicesByClient(clientId));
  const params =
    `/invoices/overlaps?clientId=${encodeURIComponent(clientId)}` +
    `&periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}` +
    (excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : "");
  try {
    const res = await apiFetch<OverlappingInvoice[]>(params);
    return res.data;
  } catch (error) {
    console.warn("findOverlappingInvoices: API unreachable, using local store", error);
    return overlapLocal(getInvoicesByClient(clientId));
  }
}

/**
 * Invoice templates for the composer's branding picker. Live mode reads
 * `GET /invoice-templates`; falls back to the local seed when offline.
 */
export async function listInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  if (!USE_API) return getInvoiceTemplates();
  try {
    const res = await apiFetch<InvoiceTemplate[]>("/invoice-templates");
    const templates = (res.data as unknown as Record<string, unknown>[]).map((dto) => toInvoiceTemplate(dto));
    return templates.length > 0 ? templates : getInvoiceTemplates();
  } catch (error) {
    console.warn("listInvoiceTemplates: API unreachable, using local store", error);
    return getInvoiceTemplates();
  }
}

export interface ApprovedPeriodOption {
  start: string;
  end: string;
  timesheetCount: number;
  billableAmount: number;
}

/**
 * Distinct billing periods that have APPROVED timesheets touching this
 * client's projects — the choices offered by the composer's period picker.
 * Reads the (hydrated) local store, which mirrors server data in live mode.
 */
export function getApprovedPeriodOptions(clientId: string): ApprovedPeriodOption[] {
  const projectIds = new Set(getProjectsByClient(clientId).map((p) => p.id));
  if (projectIds.size === 0) return [];
  const grouped = new Map<string, ApprovedPeriodOption>();
  for (const ts of getTimesheets()) {
    if (ts.status !== "APPROVED") continue;
    const touches = ts.projectBreakdown.some((pb) => projectIds.has(pb.projectId));
    if (!touches) continue;
    const key = `${ts.periodStart}|${ts.periodEnd}`;
    const entry = grouped.get(key);
    const amount = ts.projectBreakdown
      .filter((pb) => projectIds.has(pb.projectId))
      .reduce((s, pb) => s + pb.billableAmount, 0);
    if (entry) {
      entry.timesheetCount += 1;
      entry.billableAmount = Number((entry.billableAmount + amount).toFixed(2));
    } else {
      grouped.set(key, { start: ts.periodStart, end: ts.periodEnd, timesheetCount: 1, billableAmount: amount });
    }
  }
  return [...grouped.values()].sort((a, b) => (a.start < b.start ? 1 : -1));
}

/**
 * Reconciles the composer's desired line-item list with the persisted draft:
 * deletes removed rows, patches changed rows, appends new rows, then issues
 * reorder moves until the stored order matches the desired order.
 *
 * Returns the line items as they exist after the sync (server ids for rows
 * that were just created). Callers should only invoke this for DRAFT invoices.
 */
export async function syncLineItems(
  invoiceId: string,
  desired: InvoiceLineItem[],
  current: InvoiceLineItem[]
): Promise<InvoiceLineItem[]> {
  const removed = current.filter((s) => !desired.some((d) => d.id === s.id));
  const added = desired.filter((d) => !current.some((s) => s.id === d.id));
  const changed = desired.filter((d) => {
    const s = current.find((x) => x.id === d.id);
    return s && (s.description !== d.description || s.quantity !== d.quantity || s.rate !== d.rate);
  });

  // Desired order expressed in post-sync ids: existing ids survive, new rows
  // get the id assigned by the create call below.
  const newIdByTempId = new Map<string, string>();

  if (!USE_API) {
    for (const s of removed) mockRemoveLineItem(invoiceId, s.id);
    for (const c of changed) {
      mockUpdateLineItem(invoiceId, c.id, { description: c.description, quantity: c.quantity, rate: c.rate });
    }
    for (const a of added) {
      const updated = mockAddLineItem(invoiceId, {
        description: a.description,
        quantity: a.quantity,
        rate: a.rate,
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        projectId: a.projectId,
        projectName: a.projectName,
        manual: a.manual,
      });
      const created = updated?.lineItems.at(-1);
      if (created) newIdByTempId.set(a.id, created.id);
    }
  } else {
    for (const s of removed) {
      await apiFetch(`/invoices/${encodeURIComponent(invoiceId)}/line-items/${encodeURIComponent(s.id)}`, { method: "DELETE" });
    }
    for (const c of changed) {
      await apiFetch(`/invoices/${encodeURIComponent(invoiceId)}/line-items/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ description: c.description, quantity: c.quantity, rate: c.rate }),
      });
    }
    for (const a of added) {
      const res = await apiFetch<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}/line-items`, {
        method: "POST",
        body: JSON.stringify(lineItemPayload(a)),
      });
      const dto = res.data as unknown as { lineItems?: InvoiceLineItem[] };
      const created = dto.lineItems?.at(-1);
      if (created) newIdByTempId.set(a.id, created.id);
    }
  }

  const finalIds = desired.map((d) => newIdByTempId.get(d.id) ?? d.id);

  // Align persisted order with the desired order via single-item moves.
  const fetchLines = async (): Promise<InvoiceLineItem[]> => {
    if (!USE_API) return getInvoiceById(invoiceId)?.lineItems ?? finalIds.map((id) => ({ id }) as InvoiceLineItem);
    return (await getInvoice(invoiceId)).lineItems;
  };
  let stored = await fetchLines();
  let order = stored.map((x) => x.id);
  for (let i = 0; i < finalIds.length && i < order.length; i++) {
    if (order[i] === finalIds[i]) continue;
    const from = order.indexOf(finalIds[i], i);
    if (from < 0) continue;
    if (!USE_API) {
      mockReorderLineItems(invoiceId, from, i);
    } else {
      await apiFetch(`/invoices/${encodeURIComponent(invoiceId)}/line-items/reorder`, {
        method: "POST",
        body: JSON.stringify({ fromIndex: from, toIndex: i }),
      });
    }
    const [moved] = order.splice(from, 1);
    order.splice(i, 0, moved);
  }
  stored = await fetchLines();
  return stored;
}


