import type { Request, Response, NextFunction } from "express";
import { EmployeeService } from "../services/employee.service.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { OnboardingRepository } from "../repositories/onboarding.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { HTTP_STATUS, type EmploymentStatus } from "../config/constants.js";
import {
  employeeSearchQuerySchema,
  createEmployeeSchema,
  employeeSelfUpdateSchema,
  hrEmployeeUpdateSchema,
  managerEmployeeUpdateSchema,
  updateBillingStatusSchema
} from "../schemas/employee.schemas.js";

const VALID_LIFECYCLE_ACTIONS = ["activate", "suspend", "resign", "terminate", "deactivate"] as const;

const LIFECYCLE_STATUS_MAP: Record<typeof VALID_LIFECYCLE_ACTIONS[number], EmploymentStatus> = {
  activate: "ACTIVE",
  suspend: "SUSPENDED",
  resign: "RESIGNED",
  terminate: "TERMINATED",
  deactivate: "INACTIVE"
};

function getEmployeeService(): EmployeeService {
  return new EmployeeService(new EmployeeRepository(), new UserRepository(), new OnboardingRepository());
}

export const employeeController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = employeeSearchQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getEmployeeService();
      const { employees, total, page, pageSize } = await service.listEmployees(result.data);

      res.json(paginatedResponse(employees, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createEmployeeSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getEmployeeService();
      const employee = await service.createEmployee(result.data, req.user!.userId);

      res.status(HTTP_STATUS.CREATED).json(successResponse(employee));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getEmployeeService();
      const employee = await service.getEmployeeById(
        req.params.employeeId,
        req.user?.role ?? "MANAGER",
        req.user?.employeeId
      );
      res.json(successResponse(employee));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getEmployeeService();
       const role = req.user!.role;

      let schema;
      if (role === "HR") {
        schema = hrEmployeeUpdateSchema;
      } else if (role === "EMPLOYEE") {
        schema = employeeSelfUpdateSchema;
      } else if (role === "MANAGER") {
        schema = managerEmployeeUpdateSchema;
      } else {
        throw new NotFoundError("Employee was not found.");
      }

      const result = schema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const employee = await service.updateEmployee(
        req.params.employeeId,
        result.data,
        role,
        req.user?.employeeId,
        req.user!.userId
      );

      res.json(successResponse(employee));
    } catch (error) {
      next(error);
    }
  },

  updateBillingStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateBillingStatusSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getEmployeeService();
      const employee = await service.updateBillingStatus(
        req.params.employeeId,
        result.data,
        req.user!.userId
      );

      res.json(successResponse(employee));
    } catch (error) {
      next(error);
    }
  },

   lifecycleAction: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const action = req.params.action;

      if (!VALID_LIFECYCLE_ACTIONS.includes(action as typeof VALID_LIFECYCLE_ACTIONS[number])) {
        throw new NotFoundError("Unknown lifecycle action.");
      }

      const targetStatus = LIFECYCLE_STATUS_MAP[action as typeof VALID_LIFECYCLE_ACTIONS[number]];
      const service = getEmployeeService();

      const employee = await service.changeEmploymentStatus(
        req.params.employeeId,
        targetStatus,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(employee));
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getEmployeeService();
      await service.deleteEmployee(req.params.employeeId, req.user!.role, req.user!.userId);
      res.status(HTTP_STATUS.NO_CONTENT).json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }
};
