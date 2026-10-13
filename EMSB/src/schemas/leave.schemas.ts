import { z } from "zod";

const leaveTypeEnum = z.enum(["PAID", "SICK", "CASUAL", "UNPAID"] as const);
const leaveStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const);

export const leaveListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  status: leaveStatusEnum.optional(),
  leaveType: leaveTypeEnum.optional()
});

export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().optional(),
  leaveType: leaveTypeEnum,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  documentUrl: z.string().url().optional()
}).refine((data) => data.startDate <= data.endDate, {
  message: "Start date must be before or equal to end date.",
  path: ["startDate"]
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveSchema = z.object({
  comments: z.string().optional(),
  rejectionReason: z.string().optional()
});

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

export { leaveTypeEnum, leaveStatusEnum };
