import type { Request, Response, NextFunction } from "express";
import { AssignmentService } from "../services/assignment.service.js";
import { AssignmentRepository } from "../repositories/assignment.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  assignmentListQuerySchema,
  createAssignmentSchema,
  updateAssignmentSchema
} from "../schemas/assignment.schemas.js";

function getAssignmentService(): AssignmentService {
  return new AssignmentService(
    new AssignmentRepository(),
    new EmployeeRepository(),
    new ProjectRepository()
  );
}

export const assignmentController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = assignmentListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAssignmentService();
      const { assignments, total, page, pageSize } = await service.listAssignments(
        result.data,
        req.user?.role ?? "MANAGER",
        req.user?.employeeId
      );

      res.json(paginatedResponse(assignments, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createAssignmentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAssignmentService();
      const { assignment, overallocationWarning } = await service.createAssignment(
        result.data,
        req.user!.role,
        req.user!.userId
      );

      const response = overallocationWarning
        ? { ...assignment, overallocationWarning }
        : assignment;

      res.status(HTTP_STATUS.CREATED).json(successResponse(response));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getAssignmentService();
      const assignment = await service.getAssignmentById(
        req.params.assignmentId,
        req.user?.role ?? "MANAGER",
        req.user?.employeeId
      );
      res.json(successResponse(assignment));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateAssignmentSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAssignmentService();
      const assignment = await service.updateAssignment(
        req.params.assignmentId,
        result.data,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(assignment));
    } catch (error) {
      next(error);
    }
  },

  end: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getAssignmentService();
      const assignment = await service.endAssignment(
        req.params.assignmentId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(assignment));
    } catch (error) {
      next(error);
    }
  },

  getAllocation: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getAssignmentService();
      const allocation = await service.getEmployeeAllocation(
        req.params.employeeId,
        req.user?.role ?? "MANAGER",
        req.user?.employeeId
      );
      res.json(successResponse(allocation));
    } catch (error) {
      next(error);
    }
  }
};
