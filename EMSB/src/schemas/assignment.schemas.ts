import { z } from "zod";

const assignmentStatusEnum = z.enum(["ACTIVE", "ENDED", "CANCELLED"] as const);

export const assignmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  status: assignmentStatusEnum.optional()
});

export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;

export const createAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  projectId: z.string().min(1),
  role: z.string().max(100).optional(),
  allocationPercent: z.coerce.number().int().min(0).max(100),
  billable: z.boolean().default(false),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "Start date must be before or equal to end date.",
  path: ["startDate"]
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const updateAssignmentSchema = z.object({
  role: z.string().max(100).optional(),
  allocationPercent: z.coerce.number().int().min(0).max(100).optional(),
  billable: z.boolean().optional(),
  endDate: z.coerce.date().optional()
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

export { assignmentStatusEnum };
