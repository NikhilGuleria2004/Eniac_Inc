import type { Collection, Filter } from "mongodb";
import type { AuditLog } from "../models/audit.js";
import { getCollection } from "../config/database.js";

export interface AuditListFilters {
  actorUserId?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  page?: number;
  pageSize?: number;
}

export class AuditRepository {
  private get collection(): Collection<AuditLog> {
    return getCollection<AuditLog>("audit_logs");
  }

  async findById(auditId: string): Promise<AuditLog | null> {
    return this.collection.findOne({ auditId });
  }

  async findMany(
    filters: AuditListFilters
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const { page = 1, pageSize = 50, ...queryFilters } = filters;
    const query: Filter<AuditLog> = {};

    if (queryFilters.actorUserId) {
      query.actorUserId = queryFilters.actorUserId;
    }
    if (queryFilters.actorRole) {
      query.actorRole = queryFilters.actorRole;
    }
    if (queryFilters.action) {
      query.action = queryFilters.action;
    }
    if (queryFilters.entityType) {
      query.entityType = queryFilters.entityType;
    }
    if (queryFilters.entityId) {
      query.entityId = queryFilters.entityId;
    }
    if (queryFilters.requestId) {
      query.requestId = queryFilters.requestId;
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { logs, total };
  }

  async create(log: Omit<AuditLog, "_id">): Promise<AuditLog> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...log,
      _id: new ObjectId()
    });
    return { ...log, _id: result.insertedId };
  }
}
