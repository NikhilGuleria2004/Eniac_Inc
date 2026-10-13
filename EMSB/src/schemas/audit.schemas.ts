import { z } from "zod";

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  actorUserId: z.string().optional(),
  actorRole: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  requestId: z.string().optional()
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
