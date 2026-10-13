import { z } from "zod";
import { BILLING_STATUSES } from "../config/constants.js";

const billingStatusEnum = z.enum(BILLING_STATUSES);

const onboardingStageEnum = z.enum([
  "EMPLOYEE_INFORMATION",
  "EMPLOYMENT_DETAILS",
  "GEOGRAPHY",
  "BILLING_CLASSIFICATION",
  "DOCUMENTS",
  "HR_REVIEW",
  "ACTIVATION",
  "TIMESHEET_ELIGIBILITY"
] as const);

const onboardingStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "AWAITING_REVIEW",
  "REVIEWED",
  "REJECTED",
  "COMPLETED"
] as const);

const documentRequirementSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean(),
  uploaded: z.boolean()
});

export const onboardingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: onboardingStatusEnum.optional(),
  stage: onboardingStageEnum.optional(),
  search: z.string().max(100).optional()
});

export type OnboardingListQuery = z.infer<typeof onboardingListQuerySchema>;

export const createOnboardingSchema = z.object({
  employeeId: z.string().min(1),
  documentRequirements: z.array(documentRequirementSchema).optional()
});

export type CreateOnboardingInput = z.infer<typeof createOnboardingSchema>;

export const updateOnboardingSchema = z.object({
  currentStage: onboardingStageEnum.optional(),
  status: onboardingStatusEnum.optional(),
  documentRequirements: z.array(documentRequirementSchema).optional(),
  billingStatus: billingStatusEnum.optional(),
  reviewNotes: z.string().optional()
});

export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
