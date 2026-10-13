import type { Request, Response, NextFunction } from "express";
import { ClientService } from "../services/client.service.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  clientListQuerySchema,
  createClientSchema,
  updateClientSchema
} from "../schemas/client.schemas.js";

function getClientService(): ClientService {
  return new ClientService(new ClientRepository(), new ProjectRepository());
}

export const clientController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = clientListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getClientService();
      const { clients, total, page, pageSize } = await service.listClients(result.data);

      res.json(paginatedResponse(clients, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createClientSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getClientService();
      const client = await service.createClient(result.data, req.user?.role ?? "MANAGER");

      res.status(HTTP_STATUS.CREATED).json(successResponse(client));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getClientService();
      const client = await service.getClientById(req.params.clientId);
      res.json(successResponse(client));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateClientSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getClientService();
      const client = await service.updateClient(
        req.params.clientId,
        result.data,
        req.user?.role ?? "MANAGER"
      );

      res.json(successResponse(client));
    } catch (error) {
      next(error);
    }
  },

  deactivate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getClientService();
      const client = await service.deactivateClient(
        req.params.clientId,
        req.user?.role ?? "MANAGER"
      );
      res.json(successResponse(client));
    } catch (error) {
      next(error);
    }
  }
};
