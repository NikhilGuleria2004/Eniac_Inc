import { z } from "zod";

const clientStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "PROSPECT",
  "SUSPENDED",
  "CLOSED"
] as const);

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
    .optional()
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
    .optional()
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export { clientStatusEnum };
