import type { Request, Response, NextFunction } from "express";
import { InvitationService } from "../services/invitation.service.js";
import { InvitationRepository } from "../repositories/invitation.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  acceptInvitationSchema,
  invitationTokenParamSchema
} from "../schemas/invitation.schemas.js";

function getInvitationService(): InvitationService {
  return new InvitationService(
    new InvitationRepository(),
    new UserRepository(),
    new EmployeeRepository()
  );
}

export const invitationController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getInvitationService();
      const invitation = await service.createInvitation(
        req.params.employeeId,
        req.user?.role ?? "HR",
        req.user?.userId
      );
      res.status(HTTP_STATUS.CREATED).json(successResponse(invitation));
    } catch (error) {
      next(error);
    }
  },

  getByToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = invitationTokenParamSchema.safeParse(req.params);
      if (!parsed.success) {
        const formatted = formatZodError(parsed.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getInvitationService();
      const preview = await service.getInvitationByToken(parsed.data.token);
      res.json(successResponse(preview));
    } catch (error) {
      next(error);
    }
  },

  accept: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedParams = invitationTokenParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        const formatted = formatZodError(parsedParams.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const result = acceptInvitationSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getInvitationService();
      const accepted = await service.acceptInvitation(
        parsedParams.data.token,
        result.data.password
      );
      res.json(successResponse(accepted));
    } catch (error) {
      next(error);
    }
  }
};
