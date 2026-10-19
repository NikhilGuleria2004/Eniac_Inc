import { z } from "zod";
import { INVOICE_STATUSES, CURRENCIES, PAYMENT_TERMS } from "../config/constants.js";

const dateStr = z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "Valid date is required" });

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  clientId: z.string().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  search: z.string().max(100).optional()
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  rate: z.number().min(0),
  employeeId: z.string().optional(),
  employeeName: z.string().max(200).optional(),
  projectId: z.string().optional(),
  projectName: z.string().max(200).optional(),
  manual: z.boolean().default(true)
});

export const createInvoiceSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    poNumber: z.string().max(50).optional(),
    subject: z.string().min(1).max(200).default("Professional Consulting"),
    periodStart: dateStr.optional(),
    periodEnd: dateStr.optional(),
    issueDate: dateStr,
    dueDate: dateStr,
    currency: z.enum(CURRENCIES).default("USD"),
    paymentTerms: z.enum(PAYMENT_TERMS).default("NET_30"),
    taxRate: z.number().min(0).max(1).step(0.01).default(0),
    notes: z.string().max(2000).optional(),
    termsAndConditions: z.string().max(2000).optional(),
    /** Invoice template driving the PDF branding (default template when omitted). */
    templateId: z.string().min(1).optional(),
    autoPopulate: z.boolean().default(false),
    /** Source timesheets linking to the invoice (when not auto-populated server-side). */
    timesheetIds: z.array(z.string()).max(500).optional(),
    lineItems: z.array(lineItemSchema).optional()
  });
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  poNumber: z.string().max(50).optional(),
  subject: z.string().min(1).max(200).optional(),
  issueDate: dateStr.optional(),
  dueDate: dateStr.optional(),
  currency: z.enum(CURRENCIES).optional(),
  paymentTerms: z.enum(PAYMENT_TERMS).optional(),
  taxRate: z.number().min(0).max(1).step(0.01).optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(2000).optional(),
  templateId: z.string().min(1).optional()
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const addLineItemSchema = lineItemSchema;
export type AddLineItemInput = z.infer<typeof addLineItemSchema>;

export const updateLineItemSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().min(0).optional(),
  rate: z.number().min(0).optional()
});
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>;

export const reorderLineItemsSchema = z.object({
  fromIndex: z.number().int().min(0),
  toIndex: z.number().int().min(0)
});
export type ReorderLineItemsInput = z.infer<typeof reorderLineItemsSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().min(0)
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const sendInvoiceSchema = z.object({ to: z.string().email().optional() }).optional();
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
