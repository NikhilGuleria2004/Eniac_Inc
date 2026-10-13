import type { Request, Response, NextFunction } from "express";
import { ReportService } from "../services/report.service.js";
import { successResponse } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { formatZodError } from "../utils/validation.js";
import { z } from "zod";

const reportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  category: z.string().optional(),
  department: z.string().optional(),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.string().optional(),
  documentType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const CATEGORY_ROUTES: Record<string, string> = {
  employees: "workforce",
  attendance: "attendance",
  leave: "leave",
  billing: "compensation",
  documents: "documents",
  projects: "projects",
  assignments: "assignments"
};

function getReportService(): ReportService {
  return new ReportService();
}

export const reportController = {
  getReportDefinitions: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getReportService();
      const result = reportQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const definitions = service.getReportDefinitions(result.data.category);
      const categories = service.getCategories();

      res.json(
        successResponse({
          categories,
          reports: definitions
        })
      );
    } catch (error) {
      next(error);
    }
  },

  generateReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getReportService();
      const reportId = req.params.reportId;

      if (!reportId) {
        throw new NotFoundError("Report ID is required.");
      }

      const categoryForPath = CATEGORY_ROUTES[reportId];
      if (categoryForPath) {
        const definitions = service.getReportDefinitions(categoryForPath);
        res.json(
          successResponse({
            category: reportId,
            reports: definitions
          })
        );
        return;
      }

      const result = reportQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const report = await service.generateReport(reportId, result.data);

      res.json(successResponse(report));
    } catch (error) {
      next(error);
    }
  }
};
