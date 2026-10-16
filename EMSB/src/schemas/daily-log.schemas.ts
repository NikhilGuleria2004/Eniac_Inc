import { z } from "zod";
import { TASK_CATEGORIES } from "../config/constants.js";

const billingTypeEnum = z.enum(["BILLABLE", "NON_BILLABLE"]);
const createdStatusEnum = z.enum(["DRAFT", "SUBMITTED"]);

export const dailyLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "LOCKED"]).optional(),
  billingType: billingTypeEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(100).optional()
});
export type DailyLogListQuery = z.infer<typeof dailyLogListQuerySchema>;

export const createDailyLogSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    projectId: z.string().min(1, "Project is required"),
    workDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "Valid date is required" }),
    taskCategory: z.enum(TASK_CATEGORIES),
    description: z.string().min(10, "Description must be at least 10 characters").max(2000),
    regularHours: z.number().min(0, "Regular hours must be 0 or greater").max(24).multipleOf(0.25),
    overtimeHours: z.number().min(0, "Overtime hours must be 0 or greater").max(24).multipleOf(0.25),
    billingType: billingTypeEnum,
    status: createdStatusEnum.default("SUBMITTED"),
    tags: z.array(z.string().max(30)).optional()
  })
  .refine((d) => d.regularHours + d.overtimeHours <= 24, {
    message: "Total hours (regular + overtime) cannot exceed 24",
    path: ["overtimeHours"]
  });
export type CreateDailyLogInput = z.infer<typeof createDailyLogSchema>;

export const updateDailyLogSchema = z
  .object({
    taskCategory: z.enum(TASK_CATEGORIES).optional(),
    description: z.string().min(10, "Description must be at least 10 characters").max(2000).optional(),
    regularHours: z.number().min(0).max(24).multipleOf(0.25).optional(),
    overtimeHours: z.number().min(0).max(24).multipleOf(0.25).optional(),
    billingType: billingTypeEnum.optional(),
    status: createdStatusEnum.optional(),
    tags: z.array(z.string().max(30)).optional()
  })
  .refine((d) => {
    if (d.regularHours !== undefined && d.overtimeHours !== undefined) {
      return d.regularHours + d.overtimeHours <= 24;
    }
    return true;
  }, {
    message: "Total hours (regular + overtime) cannot exceed 24",
    path: ["overtimeHours"]
  });
export type UpdateDailyLogInput = z.infer<typeof updateDailyLogSchema>;
