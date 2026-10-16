import { z } from "zod";

const clientStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "PROSPECT",
  "SUSPENDED",
  "CLOSED"
] as const);

// ── CMS extensions (CMSB.md) ──
const clientTierEnum = z.enum(["ENTERPRISE", "MID_MARKET", "SMB", "PROSPECT"] as const);
const paymentTermsEnum = z.enum(["NET_15", "NET_30", "NET_45", "NET_60", "CUSTOM", "DUE_ON_RECEIPT"] as const);

const addressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional()
});

const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(200).optional(),
  email: z.string().optional(),
  phone: z.string().max(50).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().optional()
});

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: clientStatusEnum.optional(),
  industry: z.string().optional(),
  search: z.string().max(100).optional()
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50).optional(),
  status: clientStatusEnum.default("PROSPECT"),
  industry: z.string().max(100).optional(),
  contact: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(50).optional()
    })
    .optional(),
  address: z
    .object({
      line1: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional()
    })
    .optional(),
  clientTier: clientTierEnum.optional(),
  paymentTerms: paymentTermsEnum.optional(),
  taxId: z.string().max(50).optional(),
  contacts: z.array(contactSchema).optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional()
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: clientStatusEnum.optional(),
  industry: z.string().max(100).optional(),
  contact: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(50).optional()
    })
    .optional(),
  address: z
    .object({
      line1: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional()
    })
    .optional(),
  clientTier: clientTierEnum.optional(),
  paymentTerms: paymentTermsEnum.optional(),
  taxId: z.string().max(50).optional(),
  contacts: z.array(contactSchema).optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional()
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export { clientStatusEnum };
