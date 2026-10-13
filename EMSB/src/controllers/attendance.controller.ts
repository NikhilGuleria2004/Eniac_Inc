import type { Request, Response, NextFunction } from "express";
import { AttendanceService } from "../services/attendance.service.js";
import { AttendanceRepository } from "../repositories/attendance.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { HTTP_STATUS } from "../config/constants.js";
import {
  attendanceListQuerySchema,
  checkInSchema,
  checkOutSchema,
  updateAttendanceSchema,
  requestCorrectionSchema,
  reviewCorrectionSchema
} from "../schemas/attendance.schemas.js";

function getAttendanceService(): AttendanceService {
  return new AttendanceService(new AttendanceRepository(), new EmployeeRepository());
}

export const attendanceController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = attendanceListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAttendanceService();
      const { records, total, page, pageSize } = await service.listAttendance(
        result.data,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );

      res.json(paginatedResponse(records, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getByEmployeeId: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getAttendanceService();
      const { records, total } = await service.getEmployeeAttendance(
        req.params.employeeId,
        req.user?.role ?? "HR",
        req.user?.employeeId
      );

      res.json(paginatedResponse(records, 1, total, total));
    } catch (error) {
      next(error);
    }
  },

  checkIn: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = checkInSchema.safeParse(req.body ?? {});
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAttendanceService();
      const record = await service.checkIn(
        result.data,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );

      res.status(HTTP_STATUS.CREATED).json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  checkOut: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = checkOutSchema.safeParse(req.body ?? {});
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAttendanceService();
      const record = await service.checkOut(
        result.data,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );

      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = updateAttendanceSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAttendanceService();
      const record = await service.updateAttendance(
        req.params.attendanceId,
        result.data,
        req.user?.role ?? "HR"
      );

      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  },

  requestCorrection: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = requestCorrectionSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getAttendanceService();
      const correction = await service.requestCorrection(
        req.params.attendanceId,
        result.data,
        req.user?.role ?? "EMPLOYEE",
        req.user?.employeeId
      );

      res.status(HTTP_STATUS.CREATED).json(successResponse(correction));
    } catch (error) {
      next(error);
    }
  },

  listCorrections: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
      const pageSize = parseInt(String(req.query.pageSize ?? "20"), 10) || 20;
      const status = req.query.status ? String(req.query.status) : undefined;

      const service = getAttendanceService();
      const { corrections, total } = await service.listCorrections(
        { status, page, pageSize }
      );

      res.json(paginatedResponse(corrections, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  reviewCorrection: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = reviewCorrectionSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const action = req.params.action;
      if (action !== "approve" && action !== "reject") {
        throw new ValidationError("Invalid correction action.");
      }

      const service = getAttendanceService();
      const correction = await service.reviewCorrection(
        req.params.correctionId,
        action === "approve" ? "APPROVED" : "REJECTED",
        result.data.comments,
        req.user?.role ?? "HR"
      );

      res.json(successResponse(correction));
    } catch (error) {
      next(error);
    }
  }
};
