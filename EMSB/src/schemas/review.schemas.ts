import { z } from "zod";

const reviewStatusEnum = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "ACKNOWLEDGED"
] as const);

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  reviewerId: z.string().optional(),
  status: reviewStatusEnum.optional(),
  reviewPeriod: z.string().optional()
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const createReviewSchema = z.object({
  employeeId: z.string().min(1),
  reviewerId: z.string().min(1),
  reviewPeriod: z.string().min(1).max(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  strengths: z.string().max(2000).optional(),
  improvementAreas: z.string().max(2000).optional(),
  goals: z.string().max(2000).optional(),
  comments: z.string().max(2000).optional(),
  reviewDate: z.coerce.date().optional()
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  strengths: z.string().max(2000).optional(),
  improvementAreas: z.string().max(2000).optional(),
  goals: z.string().max(2000).optional(),
  comments: z.string().max(2000).optional(),
  status: reviewStatusEnum.optional(),
  reviewDate: z.coerce.date().optional()
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export { reviewStatusEnum };
