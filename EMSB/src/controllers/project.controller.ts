import type { Request, Response, NextFunction } from "express";
import { ProjectService } from "../services/project.service.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  projectListQuerySchema,
  createProjectSchema,
  updateProjectSchema
} from "../schemas/project.schemas.js";

function getProjectService(): ProjectService {
  return new ProjectService(
    new ProjectRepository(),
    new ClientRepository(),
    new EmployeeRepository()
  );
}

export const projectController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = projectListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getProjectService();
      const { projects, total, page, pageSize } = await service.listProjects(
        result.data,
        req.user?.role,
        req.user?.employeeId
      );

      res.json(paginatedResponse(projects, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createProjectSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getProjectService();
      const project = await service.createProject(result.data, req.user!.role, req.user!.userId);

      res.status(HTTP_STATUS.CREATED).json(successResponse(project));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getProjectService();
      const project = await service.getProjectById(req.params.projectId);
      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateProjectSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getProjectService();
      const project = await service.updateProject(
        req.params.projectId,
        result.data,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  },

  activate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getProjectService();
      const project = await service.activateProject(
        req.params.projectId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  },

  complete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getProjectService();
      const project = await service.completeProject(
        req.params.projectId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  },

  archive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getProjectService();
      const project = await service.archiveProject(
        req.params.projectId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  }
};
