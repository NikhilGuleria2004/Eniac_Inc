import type { Request, Response, NextFunction } from "express";
import { InvoiceService } from "../services/invoice.service.js";
import { InvoicePdfService } from "../services/invoice-pdf.service.js";
import { InvoiceRepository } from "../repositories/invoice.repository.js";
import { InvoiceTemplateRepository } from "../repositories/invoice-template.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BillingTimesheetRepository } from "../repositories/billing-timesheet.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  invoiceListQuerySchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  addLineItemSchema,
  updateLineItemSchema,
  reorderLineItemsSchema,
  recordPaymentSchema,
  sendInvoiceSchema
} from "../schemas/invoice.schemas.js";

function getService(): InvoiceService {
  return new InvoiceService(
    new InvoiceRepository(),
    new ClientRepository(),
    new ProjectRepository(),
    new BillingTimesheetRepository(),
    new EmployeeRepository()
  );
}

function getPdfService(): InvoicePdfService {
  return new InvoicePdfService(new InvoiceRepository(), new InvoiceTemplateRepository());
}

function actorRole(req: Request): "ADMIN" | "HR" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE" {
  return req.user?.role ?? "EMPLOYEE";
}

export const invoiceController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = invoiceListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const { invoices, total, page, pageSize } = await getService().listInvoices(result.data);
      res.json(paginatedResponse(invoices, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await getService().getById(req.params.invoiceId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /:invoiceId/pdf — streams the styled invoice PDF.
   * `?download=1` switches the disposition from inline to attachment.
   */
  downloadPdf: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buffer, filename } = await getPdfService().renderInvoicePdf(req.params.invoiceId);
      const disposition = req.query.download === "1" ? "attachment" : "inline";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
      res.setHeader("Content-Length", String(buffer.length));
      res.status(HTTP_STATUS.OK).send(buffer);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().createInvoice(result.data, actorRole(req), req.user!.userId);
      res.status(HTTP_STATUS.CREATED).json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  previewAutoPopulate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, periodStart, periodEnd } = req.body as { clientId?: string; periodStart?: string; periodEnd?: string };
      if (!clientId || !periodStart || !periodEnd) {
        throw new ValidationError("clientId, periodStart and periodEnd are required.");
      }
      const preview = await getService().previewAutoPopulate(clientId, periodStart, periodEnd);
      res.json(successResponse(preview));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /overlaps?clientId&‍periodStart&periodEnd — lightweight summaries of open
   * invoices overlapping a period, backing the composer's duplicate guard.
   * Returns `[]` (never 404) when there is nothing to warn about.
   */
  findOverlaps: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = String(req.query.clientId ?? "");
      const periodStart = String(req.query.periodStart ?? "");
      const periodEnd = String(req.query.periodEnd ?? "");
      const excludeId = req.query.excludeId ? String(req.query.excludeId) : undefined;
      const overlaps = await getService().findOverlappingOpen(clientId, periodStart, periodEnd, excludeId);
      res.json(successResponse(overlaps));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().updateInvoice(req.params.invoiceId, result.data, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  addLineItem: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = addLineItemSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().addLineItem(req.params.invoiceId, result.data, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  updateLineItem: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateLineItemSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().updateLineItem(req.params.invoiceId, req.params.lineItemId, result.data, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  removeLineItem: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await getService().removeLineItem(req.params.invoiceId, req.params.lineItemId, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  reorderLineItems: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reorderLineItemsSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().reorderLineItems(req.params.invoiceId, result.data.fromIndex, result.data.toIndex, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  send: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = sendInvoiceSchema.safeParse(req.body ?? {});
      const to = parsed.success ? parsed.data?.to : undefined;
      const invoice = await getService().send(req.params.invoiceId, actorRole(req), req.user?.userId, to);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  void: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await getService().voidInvoice(req.params.invoiceId, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  markPaid: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await getService().markPaid(req.params.invoiceId, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  },

  recordPayment: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = recordPaymentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const invoice = await getService().recordPayment(req.params.invoiceId, result.data.amount, actorRole(req), req.user!.userId);
      res.json(successResponse(invoice));
    } catch (error) {
      next(error);
    }
  }
};
