import type { ObjectId } from "mongodb";
import type { InvoiceStatus, PaymentTerms, Currency } from "../config/constants.js";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  currency?: string;
  employeeId?: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  manual: boolean;
  sortOrder: number;
}

export interface Invoice {
  _id: ObjectId;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  clientAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  poNumber?: string;
  subject: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  paymentTerms: PaymentTerms;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  timesheetIds?: string[];
  notes?: string;
  termsAndConditions?: string;
  /** Invoice template driving the PDF branding (falls back to the default template). */
  templateId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  sentBy?: string;
  paidAt?: Date;
}
