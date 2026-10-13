import type { ObjectId } from "mongodb";

export interface AuditLog {
  _id: ObjectId;
  auditId: string;
  actorUserId?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
