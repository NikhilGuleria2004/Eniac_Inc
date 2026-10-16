import type { Request, Response, NextFunction } from "express";
import { DailyLogService } from "../services/daily-log.service.js";
import { DailyLogRepository } from "../repositories/daily-log.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { AssignmentRepository } from "../repositories/assignment.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  dailyLogListQuerySchema,
  createDailyLogSchema,
  updateDailyLogSchema
} from "../schemas/daily-log.schemas.js";

function getDailyLogService(): DailyLogService {
  return new DailyLogService(
    new DailyLogRepository(),
    new EmployeeRepository(),
    new ProjectRepository(),
    new AssignmentRepository()
  );
}

export const dailyLogController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = dailyLogListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getDailyLogService();
      const { logs, total, page, pageSize } = await service.listDailyLogs(
        result.data,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );
      res.json(paginatedResponse(logs, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createDailyLogSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getDailyLogService();
      const log = await service.createDailyLog(
        result.data,
        req.user!.role,
        req.user?.employeeId,
        req.user!.userId
      );
      res.status(HTTP_STATUS.CREATED).json(successResponse(log));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDailyLogService();
      const log = await service.getById(
        req.params.dailyLogId,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );
      res.json(successResponse(log));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateDailyLogSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }
      const service = getDailyLogService();
      const log = await service.updateDailyLog(
        req.params.dailyLogId,
        result.data,
        req.user!.role,
        req.user?.employeeId,
        req.user!.userId
      );
      res.json(successResponse(log));
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDailyLogService();
      await service.deleteDailyLog(
        req.params.dailyLogId,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
};
