import type { Request, Response, NextFunction } from "express";
import { LeaveService } from "../services/leave.service.js";
import { LeaveRepository } from "../repositories/leave.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  leaveListQuerySchema,
  createLeaveRequestSchema,
  reviewLeaveSchema
} from "../schemas/leave.schemas.js";

function getLeaveService(): LeaveService {
  return new LeaveService(new LeaveRepository(), new EmployeeRepository());
}

export const leaveController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = leaveListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getLeaveService();
      const { requests, total, page, pageSize } = await service.listLeaveRequests(
        result.data,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );

      res.json(paginatedResponse(requests, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getLeaveService();
      const request = await service.getLeaveRequest(
        req.params.requestId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(request));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createLeaveRequestSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getLeaveService();
      const request = await service.createLeaveRequest(
        result.data,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );

      res.status(HTTP_STATUS.CREATED).json(successResponse(request));
    } catch (error) {
      next(error);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getLeaveService();
      const request = await service.approveLeaveRequest(
        req.params.requestId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(request));
    } catch (error) {
      next(error);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewLeaveSchema.safeParse(req.body ?? {});
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getLeaveService();
      const request = await service.rejectLeaveRequest(
        req.params.requestId,
        result.data.rejectionReason ?? result.data.comments ?? "",
        req.user?.role ?? "HR"
      );
      res.json(successResponse(request));
    } catch (error) {
      next(error);
    }
  },

  getBalances: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getLeaveService();
      const balances = await service.getBalances(
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(balances));
    } catch (error) {
      next(error);
    }
  },

  getBalanceByEmployee: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getLeaveService();
      const balances = await service.getBalanceByEmployee(
        req.params.employeeId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(balances));
    } catch (error) {
      next(error);
    }
  }
};
