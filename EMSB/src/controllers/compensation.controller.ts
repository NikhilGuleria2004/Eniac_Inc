import type { Request, Response, NextFunction } from "express";
import { CompensationService } from "../services/compensation.service.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { CompensationRepository } from "../repositories/compensation.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import { updateCompensationSchema } from "../schemas/compensation.schemas.js";

function getCompensationService(): CompensationService {
  return new CompensationService(new EmployeeRepository(), new CompensationRepository());
}

export const compensationController = {
  get: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getCompensationService();
      const compensation = await service.getCompensation(req.params.employeeId);
      res.json(successResponse(compensation));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateCompensationSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getCompensationService();
      const compensation = await service.updateCompensation(
        req.params.employeeId,
        result.data,
        req.user!.role,
        req.user!.userId
      );

      res.status(HTTP_STATUS.OK).json(successResponse(compensation));
    } catch (error) {
      next(error);
    }
  },

  getSalaryHistory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
      const pageSize = parseInt(String(req.query.pageSize ?? "20"), 10) || 20;
      const service = getCompensationService();
      const { history, total } = await service.getCompensationHistory(
        req.params.employeeId,
        page,
        pageSize
      );
      res.json(paginatedResponse(history, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getBillRateHistory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
      const pageSize = parseInt(String(req.query.pageSize ?? "20"), 10) || 20;
      const service = getCompensationService();
      const { history, total } = await service.getBillRateHistory(
        req.params.employeeId,
        page,
        pageSize
      );
      res.json(paginatedResponse(history, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  }
};
