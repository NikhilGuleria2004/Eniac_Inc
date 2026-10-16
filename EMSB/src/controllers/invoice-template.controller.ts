import type { Request, Response, NextFunction } from "express";
import { InvoiceTemplateService } from "../services/invoice-template.service.js";
import { InvoiceTemplateRepository } from "../repositories/invoice-template.repository.js";
import { successResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  invoiceTemplateListQuerySchema,
  createInvoiceTemplateSchema,
  updateInvoiceTemplateSchema
} from "../schemas/invoice-template.schemas.js";
import type { Role } from "../config/constants.js";

function getService(): InvoiceTemplateService {
  return new InvoiceTemplateService(new InvoiceTemplateRepository());
}

function actorRole(req: Request): Role {
  return req.user?.role ?? "EMPLOYEE";
}

export const invoiceTemplateController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = invoiceTemplateListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const templates = await getService().listTemplates(result.data.search);
      res.json(successResponse(templates));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const template = await getService().getById(req.params.invoiceTemplateId);
      res.json(successResponse(template));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createInvoiceTemplateSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const template = await getService().createTemplate(result.data, actorRole(req), req.user!.userId);
      res.status(HTTP_STATUS.CREATED).json(successResponse(template));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateInvoiceTemplateSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const template = await getService().updateTemplate(req.params.invoiceTemplateId, result.data, actorRole(req), req.user!.userId);
      res.json(successResponse(template));
    } catch (error) {
      next(error);
    }
  },

  setDefault: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const template = await getService().setDefault(req.params.invoiceTemplateId, actorRole(req), req.user!.userId);
      res.json(successResponse(template));
    } catch (error) {
      next(error);
    }
  }
};
