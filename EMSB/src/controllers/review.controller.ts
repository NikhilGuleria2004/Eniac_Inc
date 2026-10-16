import type { Request, Response, NextFunction } from "express";
import { ReviewService } from "../services/review.service.js";
import { ReviewRepository } from "../repositories/review.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  reviewListQuerySchema,
  createReviewSchema,
  updateReviewSchema
} from "../schemas/review.schemas.js";

function getReviewService(): ReviewService {
  return new ReviewService(new ReviewRepository(), new EmployeeRepository());
}

export const reviewController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getReviewService();
      const { reviews, total, page, pageSize } = await service.listReviews(
        result.data,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );

      res.json(paginatedResponse(reviews, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = createReviewSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getReviewService();
      const review = await service.createReview(result.data, req.user!.role, req.user!.userId);

      res.status(HTTP_STATUS.CREATED).json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getReviewService();
      const review = await service.getReviewById(
        req.params.reviewId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );
      res.json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateReviewSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getReviewService();
      const review = await service.updateReview(
        req.params.reviewId,
        result.data,
        req.user!.role,
        req.user!.userId
      );

      res.json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  submit: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getReviewService();
      const review = await service.submitReview(
        req.params.reviewId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  complete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getReviewService();
      const review = await service.completeReview(
        req.params.reviewId,
        req.user!.role,
        req.user!.userId
      );
      res.json(successResponse(review));
    } catch (error) {
      next(error);
    }
  }
};
