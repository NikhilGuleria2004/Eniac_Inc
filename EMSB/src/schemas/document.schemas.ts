import { z } from "zod";

const documentTypeEnum = z.enum([
  "RESUME",
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "TAX_DOCUMENT",
  "BANK_DOCUMENT",
  "CERTIFICATE",
  "NDA",
  "OTHER"
] as const);

const documentStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED"
] as const);

const documentMetadataSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  storageKey: z.string().optional()
});

export const reviewDocumentSchema = z.object({
  comments: z.string().min(1)
});

export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;

export const documentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: documentTypeEnum.optional(),
  status: documentStatusEnum.optional(),
  employeeId: z.string().optional(),
  search: z.string().max(100).optional()
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

export const createDocumentSchema = z.object({
  employeeId: z.string().min(1),
  type: documentTypeEnum,
  name: z.string().min(1).max(255),
  fileUrl: z.string().url().optional(),
  metadata: documentMetadataSchema.optional(),
  expiresAt: z.coerce.date().optional()
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  fileUrl: z.string().url().optional(),
  type: documentTypeEnum.optional(),
  metadata: documentMetadataSchema.optional(),
  expiresAt: z.coerce.date().optional()
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export { documentTypeEnum, documentStatusEnum };
