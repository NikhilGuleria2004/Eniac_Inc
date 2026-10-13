import { AuditRepository } from "../repositories/audit.repository.js";
import type { AuditLog } from "../models/audit.js";
import type { Role } from "../config/constants.js";
import { toISO } from "../utils/dates.js";
import { logger } from "../logger/logger.js";
import { v4 as uuidv4 } from "uuid";
import type { AuditListQuery } from "../schemas/audit.schemas.js";
import { getRequestContext } from "../utils/request-context.js";

export interface AuditLogDTO {
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
  createdAt: string;
}

export interface AuditContext {
  requestId?: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  before?: unknown;
  after?: unknown;
  actorUserId?: string;
}

export class AuditService {
  private static instance: AuditService;

  constructor(private auditRepository: AuditRepository) {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService(new AuditRepository());
    }
    return AuditService.instance;
  }

  /**
   * Records an audit entry. Explicit `context` values take precedence; gaps are
   * filled from the ambient request context (acting user, requestId, IP, UA).
   */
  async record(
    actorRole: Role,
    action: string,
    entityType: string,
    entityId: string,
    context?: Partial<AuditContext>
  ): Promise<void> {
    try {
      const requestContext = getRequestContext();
      const auditId = `AUD-${uuidv4()}`;
      const now = new Date();

      await this.auditRepository.create({
        auditId,
        actorUserId: context?.actorUserId ?? requestContext?.userId,
        actorRole,
        action,
        entityType,
        entityId,
        before: context?.before,
        after: context?.after,
        requestId: context?.requestId ?? requestContext?.requestId,
        ipAddress: context?.ipAddress ?? requestContext?.ipAddress,
        userAgent: context?.userAgent ?? requestContext?.userAgent,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      logger.warn({ error, action, entityType, entityId }, "Failed to write audit log");
    }
  }

  async findById(auditId: string): Promise<AuditLogDTO> {
    const log = await this.auditRepository.findById(auditId);
    if (!log) {
      return this.toDTO(null);
    }
    return this.toDTO(log);
  }

  async findMany(
    filters: AuditListQuery
  ): Promise<{ logs: AuditLogDTO[]; total: number; page: number; pageSize: number }> {
    const { logs, total } = await this.auditRepository.findMany({
      actorUserId: filters.actorUserId,
      actorRole: filters.actorRole,
      action: filters.action,
      entityType: filters.entityType,
      entityId: filters.entityId,
      requestId: filters.requestId,
      page: filters.page,
      pageSize: filters.pageSize
    });

    return {
      logs: logs.map((l) => this.toDTO(l)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  private toDTO(log: AuditLog | null): AuditLogDTO {
    if (!log) {
      return {
        auditId: "",
        actorRole: "",
        action: "",
        entityType: "",
        entityId: "",
        createdAt: ""
      };
    }

    return {
      auditId: log.auditId,
      actorUserId: log.actorUserId,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      before: log.before,
      after: log.after,
      requestId: log.requestId,
      ipAddress: log.ipAddress,
      createdAt: toISO(log.createdAt) ?? ""
    };
  }
}
