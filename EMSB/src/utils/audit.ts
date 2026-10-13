import type { Role } from "../config/constants.js";
import { AuditService } from "../services/audit.service.js";

const auditService = AuditService.getInstance();

export async function writeAuditLog(
  actorRole: Role,
  action: string,
  entityType: string,
  entityId: string,
  actorUserId?: string
): Promise<void> {
  await auditService.record(actorRole, action, entityType, entityId, {
    actorUserId
  });
}