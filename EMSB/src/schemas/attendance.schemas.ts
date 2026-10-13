import { z } from "zod";

const attendanceStatusEnum = z.enum(["P", "A", "L", "LV", "M"] as const);

const attendanceStatusLabelEnum = z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE", "MISSING"] as const);

export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  status: attendanceStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional()
});

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;

export const checkInSchema = z.object({
  employeeId: z.string().optional(),
  checkIn: z.coerce.date().optional()
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  checkOut: z.coerce.date().optional()
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const updateAttendanceSchema = z.object({
  status: attendanceStatusLabelEnum.optional(),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  notes: z.string().optional()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const requestCorrectionSchema = z.object({
  reason: z.string().min(1),
  requestedCheckIn: z.coerce.date().optional(),
  requestedCheckOut: z.coerce.date().optional()
});

export type RequestCorrectionInput = z.infer<typeof requestCorrectionSchema>;

export const reviewCorrectionSchema = z.object({
  comments: z.string().min(1)
});

export type ReviewCorrectionInput = z.infer<typeof reviewCorrectionSchema>;

export { attendanceStatusEnum, attendanceStatusLabelEnum };
