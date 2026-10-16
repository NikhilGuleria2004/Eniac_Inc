import { z } from "zod";

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color");

const taxSettingsSchema = z.object({
  defaultRate: z.number().min(0).max(100),
  label: z.string().max(50)
});

export const invoiceTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional()
});
export type InvoiceTemplateListQuery = z.infer<typeof invoiceTemplateListQuerySchema>;

export const createInvoiceTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  logoUrl: z.string().max(500).optional(),
  primaryColor: hexColor.default("#1D4ED8"),
  secondaryColor: hexColor.optional(),
  footerNote: z.string().max(500).optional(),
  termsAndConditions: z.string().max(2000).optional(),
  paymentInstructions: z.string().max(2000).optional(),
  taxSettings: taxSettingsSchema.optional(),
  isDefault: z.boolean().default(false)
});
export type CreateInvoiceTemplateInput = z.infer<typeof createInvoiceTemplateSchema>;

export const updateInvoiceTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().max(500).optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  footerNote: z.string().max(500).optional(),
  termsAndConditions: z.string().max(2000).optional(),
  paymentInstructions: z.string().max(2000).optional(),
  taxSettings: taxSettingsSchema.optional(),
  isDefault: z.boolean().optional()
});
export type UpdateInvoiceTemplateInput = z.infer<typeof updateInvoiceTemplateSchema>;
