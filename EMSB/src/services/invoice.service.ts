import { InvoiceRepository } from "../repositories/invoice.repository.js";
import { InvoiceTemplateRepository } from "../repositories/invoice-template.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BillingTimesheetRepository } from "../repositories/billing-timesheet.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { Invoice, InvoiceLineItem } from "../models/invoice.js";
import type { Role, InvoiceStatus } from "../config/constants.js";
import { NotFoundError, ValidationError, BusinessRuleError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { emitNotification } from "../utils/notification-emitter.js";
import { runInTransaction } from "../utils/transaction.js";
import { geographyOf, resolveResourceRate } from "../lib/rates.js";
import { InvoicePdfService, humanizePaymentTerms } from "./invoice-pdf.service.js";
import { formatInvoicePdfDate, formatInvoicePdfMoney } from "../integrations/pdf/invoice-pdf.renderer.js";
import { buildInvoiceEmail, getMailAdapter } from "../integrations/mail/index.js";
import { logger } from "../logger/logger.js";
import type {
  InvoiceListQuery,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  AddLineItemInput,
  UpdateLineItemInput
} from "../schemas/invoice.schemas.js";

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "VOID", "PARTIAL"],
  OVERDUE: ["PAID", "VOID", "PARTIAL"],
  PARTIAL: ["PAID", "OVERDUE", "PARTIAL"],
  PAID: [],
  VOID: [],
  CANCELLED: []
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function recompute(invoice: Omit<Invoice, "_id">): void {
  const subtotal = Number(invoice.lineItems.reduce((s, li) => s + li.amount, 0).toFixed(2));
  const taxAmount = Number((subtotal * invoice.taxRate).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  invoice.subtotal = subtotal;
  invoice.taxAmount = taxAmount;
  invoice.totalAmount = totalAmount;
  invoice.balanceDue = Number((totalAmount - invoice.amountPaid).toFixed(2));
}

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  clientAddress?: Invoice["clientAddress"];
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  paymentTerms: string;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  overdue: boolean;
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  sentAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class InvoiceService {
  constructor(
    private repo: InvoiceRepository,
    private clientRepo: ClientRepository,
    private projectRepo: ProjectRepository,
    private timesheetRepo: BillingTimesheetRepository,
    private employeeRepo: EmployeeRepository
  ) {}

  async listInvoices(filters: InvoiceListQuery): Promise<{ invoices: InvoiceDTO[]; total: number; page: number; pageSize: number }> {
    const { invoices, total } = await this.repo.findMany(filters);
    return { invoices: invoices.map((i) => this.toDTO(i)), total, page: filters.page, pageSize: filters.pageSize };
  }

  async getById(invoiceId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    return this.toDTO(invoice);
  }

   async createInvoice(input: CreateInvoiceInput, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const client = await this.clientRepo.findById(input.clientId);
    if (!client) throw new NotFoundError("Client was not found.");

    const { invoiceId, invoiceNumber } = await this.repo.generateId();
    let lineItems: InvoiceLineItem[] = [];
    let timesheetIds: string[] | undefined;

    if (input.autoPopulate) {
      if (!input.periodStart || !input.periodEnd) {
        throw new ValidationError("Period start and end are required for auto-populate.");
      }
      const generated = await this.autoPopulate(input.clientId, input.periodStart.slice(0, 10), input.periodEnd.slice(0, 10));
      lineItems = generated.lineItems;
      timesheetIds = generated.timesheetIds;
    }
    if (input.lineItems?.length) {
      lineItems = [...lineItems, ...input.lineItems.map((li, i) => this.normalizeLine(li, i + lineItems.length))];
    }
    // Source-timesheet linkage can also be supplied by the client (the CMS
    // composer round-trips the preview's ids); auto-populate wins if both.
    if (timesheetIds === undefined && input.timesheetIds?.length) {
      timesheetIds = input.timesheetIds;
    }

    const invoice: Omit<Invoice, "_id"> = {
      invoiceId,
      invoiceNumber,
      clientId: input.clientId,
      clientName: client.name,
      clientCode: client.code ?? client.clientId,
      clientAddress: (() => {
        const a = client.billingAddress ?? client.address;
        return a
          ? {
              line1: a.line1,
              line2: client.billingAddress?.line2,
              city: a.city,
              state: a.state,
              postalCode: a.postalCode,
              country: a.country
            }
          : undefined;
      })(),
      poNumber: input.poNumber,
      subject: input.subject,
      periodStart: input.periodStart?.slice(0, 10),
      periodEnd: input.periodEnd?.slice(0, 10),
      issueDate: input.issueDate.slice(0, 10),
      dueDate: input.dueDate.slice(0, 10),
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      taxRate: input.taxRate,
      taxAmount: 0,
      subtotal: 0,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      status: "DRAFT",
      lineItems,
      timesheetIds,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      templateId: input.templateId,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    recompute(invoice);
    const created = await this.repo.create(invoice);
    await writeAuditLog(actorRole, "invoice.created", "invoice", created.invoiceNumber, actorUserId);
    return this.toDTO(created);
  }

  async updateInvoice(invoiceId: string, input: UpdateInvoiceInput, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertDraft(invoice);
    const update: Partial<Invoice> = {};
    if (input.poNumber !== undefined) update.poNumber = input.poNumber;
    if (input.subject !== undefined) update.subject = input.subject;
    if (input.issueDate !== undefined) update.issueDate = input.issueDate.slice(0, 10);
    if (input.dueDate !== undefined) update.dueDate = input.dueDate.slice(0, 10);
    if (input.currency !== undefined) update.currency = input.currency;
    if (input.paymentTerms !== undefined) update.paymentTerms = input.paymentTerms;
    if (input.taxRate !== undefined) update.taxRate = input.taxRate;
    if (input.notes !== undefined) update.notes = input.notes;
    if (input.termsAndConditions !== undefined) update.termsAndConditions = input.termsAndConditions;
    if (input.templateId !== undefined) update.templateId = input.templateId;
    const merged = { ...invoice, ...update };
    recompute(merged);
    update.taxAmount = merged.taxAmount;
    update.subtotal = merged.subtotal;
    update.totalAmount = merged.totalAmount;
    update.balanceDue = merged.balanceDue;
    const updated = await this.repo.update(invoiceId, update);
    await writeAuditLog(actorRole, "invoice.updated", "invoice", invoiceId, actorUserId);
    return this.toDTO(updated!);
  }

  async addLineItem(invoiceId: string, input: AddLineItemInput, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertDraft(invoice);
    const lineItems = [...invoice.lineItems, this.normalizeLine(input, invoice.lineItems.length)];
    return this.persistLines(invoice, lineItems, actorRole, actorUserId);
  }

  async updateLineItem(invoiceId: string, lineItemId: string, input: UpdateLineItemInput, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertDraft(invoice);
    const lineItems = invoice.lineItems.map((li) => {
      if (li.id !== lineItemId) return li;
      const next = { ...li };
      if (input.description !== undefined) next.description = input.description;
      if (input.quantity !== undefined) next.quantity = input.quantity;
      if (input.rate !== undefined) next.rate = input.rate;
      next.amount = Number((next.quantity * next.rate).toFixed(2));
      return next;
    });
    return this.persistLines(invoice, lineItems, actorRole, actorUserId);
  }

  async removeLineItem(invoiceId: string, lineItemId: string, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertDraft(invoice);
    const lineItems = invoice.lineItems.filter((li) => li.id !== lineItemId).map((li, i) => ({ ...li, sortOrder: i }));
    return this.persistLines(invoice, lineItems, actorRole, actorUserId);
  }

  async reorderLineItems(invoiceId: string, fromIndex: number, toIndex: number, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertDraft(invoice);
    if (fromIndex === toIndex || fromIndex < 0 || toIndex >= invoice.lineItems.length) {
      return this.toDTO(invoice);
    }
    const items = [...invoice.lineItems];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    const lineItems = items.map((li, i) => ({ ...li, sortOrder: i }));
    return this.persistLines(invoice, lineItems, actorRole, actorUserId);
  }

  async send(invoiceId: string, actorRole: Role, actorUserId?: string, to?: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertTransition(invoice.status, "SENT");
    const updated = await this.repo.update(invoiceId, { status: "SENT", sentAt: new Date(), sentBy: actorUserId ?? actorRole });
    await writeAuditLog(actorRole, "invoice.sent", "invoice", invoiceId, actorUserId);
    await emitNotification("onInvoiceSent", { invoiceId }, invoice.invoiceNumber, invoice.clientName);
    await this.dispatchInvoiceEmail(updated!, to);
    return this.toDTO(updated!);
  }

  /**
   * Best-effort dispatch of the invoice email with the rendered PDF attached.
   * The recipient is the explicit `to` when provided, otherwise the client's
   * stored contact email. Any failure is logged and swallowed so the send
   * itself (already persisted) is never rolled back by an email problem.
   */
  private async dispatchInvoiceEmail(invoice: Invoice, to?: string): Promise<void> {
    try {
      const recipient = to ?? (await this.resolveClientEmail(invoice.clientId));
      if (!recipient) {
        logger.warn({ invoiceId: invoice.invoiceId }, "Invoice email skipped: no recipient address");
        return;
      }
      const pdfService = new InvoicePdfService(this.repo, new InvoiceTemplateRepository());
      const { buffer, filename } = await pdfService.renderInvoicePdf(invoice.invoiceId);
      const message = buildInvoiceEmail({
        to: recipient,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        subject: invoice.subject,
        totalDue: formatInvoicePdfMoney(invoice.totalAmount, invoice.currency),
        dueDate: formatInvoicePdfDate(invoice.dueDate),
        paymentTerms: humanizePaymentTerms(invoice.paymentTerms),
        attachment: { filename, content: buffer, contentType: "application/pdf" }
      });
      await getMailAdapter().send(message);
    } catch (error) {
      logger.warn({ error, invoiceId: invoice.invoiceId }, "Invoice email dispatch failed");
    }
  }

  private async resolveClientEmail(clientId: string): Promise<string | undefined> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) return undefined;
    return (
      client.contact?.email ??
      client.contacts?.find((c) => c.isPrimary)?.email ??
      client.contacts?.find((c) => c.email)?.email
    );
  }

  async voidInvoice(invoiceId: string, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertTransition(invoice.status, "VOID");
    const updated = await this.repo.update(invoiceId, { status: "VOID" });
    await writeAuditLog(actorRole, "invoice.voided", "invoice", invoiceId, actorUserId);
    return this.toDTO(updated!);
  }

  async markPaid(invoiceId: string, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertTransition(invoice.status, "PAID");
    const merged = { ...invoice, amountPaid: invoice.totalAmount };
    merged.balanceDue = 0;
    merged.status = "PAID";
    const updated = await this.repo.update(invoiceId, { status: "PAID", amountPaid: invoice.totalAmount, balanceDue: 0, paidAt: new Date() });
    await writeAuditLog(actorRole, "invoice.paid", "invoice", invoiceId, actorUserId);
    return this.toDTO(updated!);
  }

  async recordPayment(invoiceId: string, amount: number, actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");
    this.assertTransition(invoice.status, "PARTIAL");
    const amountPaid = Number((invoice.amountPaid + amount).toFixed(2));
    const balanceDue = Number((invoice.totalAmount - amountPaid).toFixed(2));
    const status: InvoiceStatus = balanceDue <= 0 ? "PAID" : "PARTIAL";
    const updated = await this.repo.update(invoiceId, { status, amountPaid, balanceDue, paidAt: balanceDue <= 0 ? new Date() : invoice.paidAt });
    if (status === "PAID") {
      await writeAuditLog(actorRole, "invoice.paid", "invoice", invoiceId, actorUserId);
    }
    return this.toDTO(updated!);
  }

  async previewAutoPopulate(clientId: string, periodStart: string, periodEnd: string): Promise<{ lineItems: InvoiceLineItem[]; timesheetIds: string[] }> {
    return this.autoPopulate(clientId, periodStart, periodEnd);
  }

  /**
   * Open invoices overlapping a client period — the composer's duplicate guard.
   * Returns lightweight summaries; empty when there is nothing to warn about.
   */
  async findOverlappingOpen(clientId: string, periodStart: string, periodEnd: string, excludeId?: string): Promise<Array<{ id: string; invoiceNumber: string; status: string; periodStart?: string; periodEnd?: string }>> {
    if (!periodStart || !periodEnd) return [];
    const matches = await this.repo.findOverlappingOpen(clientId, periodStart.slice(0, 10), periodEnd.slice(0, 10), excludeId);
    return matches.map((m) => ({
      id: m.invoiceId,
      invoiceNumber: m.invoiceNumber,
      status: m.status,
      periodStart: m.periodStart,
      periodEnd: m.periodEnd
    }));
  }

  private async autoPopulate(clientId: string, periodStart: string, periodEnd: string): Promise<{ lineItems: InvoiceLineItem[]; timesheetIds: string[] }> {
    const projects = await this.projectRepo.findMany({ clientId, page: 1, pageSize: 100 });
    const projectIds = new Set(projects.projects.map((p) => p.projectId));
    const approved = await this.timesheetRepo.findMany({ status: "APPROVED", periodStart });
    const timesheets = approved.timesheets.filter(
      (t) => t.periodStart >= periodStart && t.periodEnd <= periodEnd && t.projectBreakdown.some((pb) => projectIds.has(pb.projectId))
    );
    if (timesheets.length === 0) {
      throw new BusinessRuleError("No approved timesheets found for this client and period.", "NO_APPROVED_TIMESHEETS");
    }

    const groups = new Map<string, { rate: number; employeeIds: string[]; projectName: string }>();
    for (const ts of timesheets) {
      const emp = await this.employeeRepo.findByEmployeeId(ts.employeeId);
      if (!emp) continue;
      const name = `${geographyOf(emp.country)} ${emp.techRole ?? emp.designation}`;
      const rate = resolveResourceRate(emp) ?? 0;
      const g = groups.get(name);
      if (g) g.employeeIds.push(ts.employeeId);
      else groups.set(name, { rate, employeeIds: [ts.employeeId], projectName: ts.projectBreakdown[0]?.projectName ?? "" });
    }

    const lineItems: InvoiceLineItem[] = [];
    let sortOrder = 0;
    for (const [name, g] of groups) {
      g.employeeIds.forEach((_employeeId, i) => {
        const desc = g.employeeIds.length > 1 ? `${name} #${i + 1}` : name;
        lineItems.push({
          id: `LI-${Date.now()}-${sortOrder}`,
          description: desc,
          quantity: 1,
          rate: g.rate,
          amount: g.rate,
          manual: false,
          sortOrder: sortOrder++
        });
      });
    }
    return { lineItems, timesheetIds: timesheets.map((t) => t.timesheetId) };
  }

  private normalizeLine(input: AddLineItemInput, sortOrder: number): InvoiceLineItem {
    return {
      id: `LI-${Date.now()}-${sortOrder}`,
      description: input.description,
      quantity: input.quantity,
      rate: input.rate,
      amount: Number((input.quantity * input.rate).toFixed(2)),
      currency: undefined,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      projectId: input.projectId,
      projectName: input.projectName,
      manual: input.manual ?? true,
      sortOrder
    };
  }

  private async persistLines(invoice: Invoice, lineItems: InvoiceLineItem[], actorRole: Role, actorUserId: string): Promise<InvoiceDTO> {
    const merged = { ...invoice, lineItems };
    recompute(merged);
    // Line items + recomputed totals must land together or not at all.
    const updated = await runInTransaction(() =>
      this.repo.update(invoice.invoiceId, {
        lineItems,
        subtotal: merged.subtotal,
        taxAmount: merged.taxAmount,
        totalAmount: merged.totalAmount,
        balanceDue: merged.balanceDue
      })
    );
    await writeAuditLog(actorRole, "invoice.updated", "invoice", invoice.invoiceId, actorUserId);
    return this.toDTO(updated!);
  }

  private assertDraft(invoice: Invoice): void {
    if (invoice.status !== "DRAFT") {
      throw new BusinessRuleError("Only draft invoices can be edited.", "INVOICE_NOT_DRAFT");
    }
  }

  private assertTransition(from: InvoiceStatus, to: InvoiceStatus): void {
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessRuleError(
        `Invalid invoice status transition from ${from} to ${to}`,
        "INVALID_INVOICE_TRANSITION"
      );
    }
  }

  private toDTO(invoice: Invoice): InvoiceDTO {
    const overdue =
      (invoice.status === "SENT" || invoice.status === "PARTIAL") && invoice.dueDate < todayIso();
    return {
      id: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientCode: invoice.clientCode,
      clientAddress: invoice.clientAddress,
      poNumber: invoice.poNumber,
      subject: invoice.subject,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      periodLabel: invoice.periodLabel,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      status: overdue && invoice.status === "SENT" ? "OVERDUE" : invoice.status,
      overdue,
      lineItems: invoice.lineItems,
      timesheetIds: invoice.timesheetIds,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      templateId: invoice.templateId,
      sentAt: toISO(invoice.sentAt),
      createdBy: invoice.createdBy,
      createdAt: toISO(invoice.createdAt) ?? "",
      updatedAt: toISO(invoice.updatedAt) ?? ""
    };
  }
}
