import type { ObjectId } from "mongodb";

export interface InvoiceTemplateTaxSettings {
  defaultRate: number;
  label: string;
}

export interface InvoiceTemplate {
  _id: ObjectId;
  invoiceTemplateId: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  footerNote?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  taxSettings?: InvoiceTemplateTaxSettings;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
