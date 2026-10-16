import { z } from "zod";
import { TIMESHEET_STATUSES } from "../config/constants.js";

const dateStr = z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: "Valid date is required" });

export const timesheetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(TIMESHEET_STATUSES).optional(),
  periodStart: z.string().optional(),
  search: z.string().max(100).optional()
});
export type TimesheetListQuery = z.infer<typeof timesheetListQuerySchema>;

export const compileTimesheetSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    periodStart: dateStr,
    periodEnd: dateStr
  })
  .refine((d) => d.periodStart <= d.periodEnd, {
    message: "Period start must be before or equal to period end.",
    path: ["periodStart"]
  });
export type CompileTimesheetInput = z.infer<typeof compileTimesheetSchema>;

export const createManualTimesheetSchema = z
  .object({
    employeeId: z.string().min(1),
    periodStart: dateStr,
    periodEnd: dateStr,
    status: z.enum(["DRAFT", "SUBMITTED"]).default("DRAFT"),
    reviewNotes: z.string().max(2000).optional()
  })
  .refine((d) => d.periodStart <= d.periodEnd, {
    message: "Period start must be before or equal to period end.",
    path: ["periodStart"]
  });
export type CreateManualTimesheetInput = z.infer<typeof createManualTimesheetSchema>;

export const reviewTimesheetSchema = z.object({
  notes: z.string().max(2000).optional()
});
export type ReviewTimesheetInput = z.infer<typeof reviewTimesheetSchema>;
