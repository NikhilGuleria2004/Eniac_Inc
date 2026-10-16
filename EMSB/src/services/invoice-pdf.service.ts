import { InvoiceRepository } from "../repositories/invoice.repository.js";
import { InvoiceTemplateRepository } from "../repositories/invoice-template.repository.js";
import { NotFoundError } from "../utils/errors.js";
import { ORG_BILLING_INFO } from "../config/constants.js";
import {
  renderInvoicePdf,
  type InvoicePdfModel,
  type InvoicePdfBranding
} from "../integrations/pdf/invoice-pdf.renderer.js";
import type { Invoice, InvoiceLineItem } from "../models/invoice.js";
import type { PaymentTerms } from "../config/constants.js";

export interface RenderedInvoicePdf {
  buffer: Buffer;
  filename: string;
}

/** Humanizes stored payment-terms enums for display on the document. */
export function humanizePaymentTerms(terms: PaymentTerms | string): string {
  if (terms === "DUE_ON_RECEIPT") return "Due on Receipt";
  const net = /^NET_(\d+)$/.exec(terms);
  if (net) return `Net ${net[1]}`;
  return terms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Produces the client-facing PDF for a stored invoice, in the visual style of
 * the reference document (`INV-000001.pdf`). Loads the invoice plus the
 * default invoice template (branding colors / footer note), maps them to the
 * renderer's plain view-model, and returns the rendered buffer.
 */
export class InvoicePdfService {
  constructor(
    private repo: InvoiceRepository,
    private templateRepo: InvoiceTemplateRepository
  ) {}

  async renderInvoicePdf(invoiceId: string): Promise<RenderedInvoicePdf> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice was not found.");

    // A template chosen at creation wins; otherwise the default template.
    const template = invoice.templateId
      ? ((await this.templateRepo.findById(invoice.templateId)) ?? (await this.templateRepo.findDefault()))
      : await this.templateRepo.findDefault();
    const branding: InvoicePdfBranding | undefined = template
      ? { primaryColor: template.primaryColor, footerNote: template.footerNote }
      : undefined;
    const model = this.toPdfModel(invoice, template?.paymentInstructions);

    const buffer = await renderInvoicePdf(model, branding);
    return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
  }

  private toPdfModel(invoice: Invoice, paymentInstructions?: string): InvoicePdfModel {
    const addressLines: string[] = [];
    const address = invoice.clientAddress;
    if (address) {
      if (address.line1) addressLines.push(address.line1);
      if (address.line2) addressLines.push(address.line2);
      if (address.city) addressLines.push(address.city);
      const cityLine = [address.postalCode, address.state].filter(Boolean).join(" ");
      if (cityLine) addressLines.push(cityLine);
      if (address.country) addressLines.push(address.country);
    }

    const lineItems: InvoiceLineItem[] = [...invoice.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      invoiceNumber: invoice.invoiceNumber,
      subject: invoice.subject,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentTermsLabel: humanizePaymentTerms(invoice.paymentTerms),
      poNumber: invoice.poNumber,
      currency: invoice.currency,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      balanceDue: invoice.balanceDue,
      lineItems: lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        amount: li.amount
      })),
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      paymentInstructions,
      client: { name: invoice.clientName, addressLines },
      org: {
        name: ORG_BILLING_INFO.name,
        addressLines: [...ORG_BILLING_INFO.addressLines],
        email: ORG_BILLING_INFO.email
      }
    };
  }
}
