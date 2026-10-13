import type { Request, Response, NextFunction } from "express";
import { OnboardingService } from "../services/onboarding.service.js";
import { OnboardingRepository } from "../repositories/onboarding.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  onboardingListQuerySchema,
  createOnboardingSchema,
  updateOnboardingSchema
} from "../schemas/onboarding.schemas.js";

function getOnboardingService(): OnboardingService {
  return new OnboardingService(new OnboardingRepository(), new EmployeeRepository(), new DocumentRepository());
}

export const onboardingController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = onboardingListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getOnboardingService();
      const { records, total, page, pageSize } = await service.listOnboarding(result.data);
      res.json(paginatedResponse(records, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createOnboardingSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getOnboardingService();
      const record = await service.createOnboarding(result.data, req.user?.role ?? "HR");
      res.status(HTTP_STATUS.CREATED).json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getOnboardingService();
      const record = await service.getOnboarding(
        req.params.employeeId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateOnboardingSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getOnboardingService();
      const record = await service.updateOnboarding(
        req.params.employeeId,
        result.data,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  submit: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getOnboardingService();
      const record = await service.submitOnboarding(
        req.params.employeeId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  review: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewNotes } = req.body as { reviewNotes?: string };
      const service = getOnboardingService();
      const record = await service.reviewOnboarding(
        req.params.employeeId,
        reviewNotes ?? "",
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getOnboardingService();
      const record = await service.approveOnboarding(
        req.params.employeeId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rejectionReason } = req.body as { rejectionReason?: string };
      const service = getOnboardingService();
      const record = await service.rejectOnboarding(
        req.params.employeeId,
        rejectionReason ?? "",
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  activate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getOnboardingService();
      const record = await service.activateOnboarding(
        req.params.employeeId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }
};
