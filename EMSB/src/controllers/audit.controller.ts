import type { Request, Response, NextFunction } from "express";
import { AuditService } from "../services/audit.service.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { NotFoundError } from "../utils/errors.js";
import { auditListQuerySchema } from "../schemas/audit.schemas.js";

function getAuditService(): AuditService {
  return AuditService.getInstance();
}

export const auditController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = auditListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAuditService();
      const { logs, total, page, pageSize } = await service.findMany(result.data);

      res.json(paginatedResponse(logs, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getAuditService();
      const log = await service.findById(req.params.auditId);

      if (!log.auditId) {
        throw new NotFoundError("Audit log was not found.");
      }

      res.json(successResponse(log));
    } catch (error) {
      next(error);
    }
  }
};
