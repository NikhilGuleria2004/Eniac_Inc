import type { Request, Response, NextFunction } from "express";
import { DocumentService } from "../services/document.service.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  documentListQuerySchema,
  createDocumentSchema,
  updateDocumentSchema,
  reviewDocumentSchema
} from "../schemas/document.schemas.js";

function getDocumentService(): DocumentService {
  return new DocumentService(new DocumentRepository(), new EmployeeRepository());
}

export const documentController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = documentListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const { documents, total, page, pageSize } = await service.listDocuments(
        result.data,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );

      res.json(paginatedResponse(documents, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const document = await service.createDocument(result.data, req.user!.role, req.user!.employeeId, req.user!.userId);

      res.status(HTTP_STATUS.CREATED).json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDocumentService();
      const document = await service.getDocumentById(
        req.params.documentId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const document = await service.updateDocument(
        req.params.documentId,
        result.data,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const document = await service.approveDocument(
        req.params.documentId,
        result.data.comments,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const document = await service.rejectDocument(
        req.params.documentId,
        result.data.comments,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  requestChanges: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getDocumentService();
      const document = await service.requestChanges(
        req.params.documentId,
        result.data.comments,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(document));
    } catch (error) {
      next(error);
    }
  },

  getExpiringSoon: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDocumentService();
      const documents = await service.getExpiringSoon(30);
      res.json(successResponse(documents));
    } catch (error) {
      next(error);
    }
  },

  getExpired: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDocumentService();
      const documents = await service.getExpired();
      res.json(successResponse(documents));
    } catch (error) {
      next(error);
    }
  }
};
