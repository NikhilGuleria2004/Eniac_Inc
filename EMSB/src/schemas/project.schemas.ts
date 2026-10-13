import { z } from "zod";

const projectStatusEnum = z.enum([
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED"
] as const);

const projectHealthEnum = z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const);

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: projectStatusEnum.optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  health: projectHealthEnum.optional(),
  search: z.string().optional()
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const createProjectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  status: projectStatusEnum.default("PLANNING"),
  health: projectHealthEnum.default("ON_TRACK"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  managerId: z.string().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "Start date must be before or equal to end date.",
  path: ["startDate"]
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  status: projectStatusEnum.optional(),
  health: projectHealthEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  managerId: z.string().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "Start date must be before or equal to end date.",
  path: ["startDate"]
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export { projectStatusEnum, projectHealthEnum };
