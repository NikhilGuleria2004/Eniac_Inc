import type { Request, Response, NextFunction } from "express";
import { BillingTimesheetService } from "../services/billing-timesheet.service.js";
import { BillingTimesheetRepository } from "../repositories/billing-timesheet.repository.js";
import { DailyLogRepository } from "../repositories/daily-log.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  timesheetListQuerySchema,
  compileTimesheetSchema,
  createManualTimesheetSchema,
  reviewTimesheetSchema
} from "../schemas/billing-timesheet.schemas.js";

function getService(): BillingTimesheetService {
  return new BillingTimesheetService(
    new BillingTimesheetRepository(),
    new DailyLogRepository(),
    new EmployeeRepository()
  );
}

export const billingTimesheetController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = timesheetListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getService();
      const { timesheets, total, page, pageSize } = await service.listTimesheets(
        result.data,
        req.user!.role,
        req.user?.employeeId
      );
      res.json(paginatedResponse(timesheets, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  mine: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getService();
      const timesheets = await service.listMyTimesheets(req.user?.employeeId);
      res.json(successResponse(timesheets));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getService();
      const timesheet = await service.getById(req.params.timesheetId, req.user!.role, req.user?.employeeId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  compile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = compileTimesheetSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getService();
      const timesheet = await service.compileTimesheet(result.data, req.user!.role, req.user?.employeeId, req.user!.userId);
      res.status(HTTP_STATUS.CREATED).json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  createManual: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createManualTimesheetSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getService();
      const timesheet = await service.createManual(result.data, req.user!.role, req.user!.userId);
      res.status(HTTP_STATUS.CREATED).json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  submit: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getService();
      const timesheet = await service.submit(req.params.timesheetId, req.user!.role, req.user?.employeeId, req.user!.userId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewTimesheetSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getService();
      const reviewer = `${req.user!.email ?? req.user!.role}`;
      const timesheet = await service.approve(req.params.timesheetId, reviewer, result.data.notes, req.user!.role, req.user!.userId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewTimesheetSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getService();
      const reviewer = `${req.user!.email ?? req.user!.role}`;
      const timesheet = await service.reject(req.params.timesheetId, reviewer, result.data.notes, req.user!.role, req.user!.userId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  revise: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getService();
      const timesheet = await service.revise(req.params.timesheetId, req.user!.role, req.user?.employeeId, req.user!.userId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  },

  markPaid: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getService();
      const timesheet = await service.markPaid(req.params.timesheetId, req.user!.role, req.user!.userId);
      res.json(successResponse(timesheet));
    } catch (error) {
      next(error);
    }
  }
};
