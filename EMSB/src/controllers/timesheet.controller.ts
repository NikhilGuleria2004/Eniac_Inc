import type { Request, Response, NextFunction } from "express";
import { TimesheetService } from "../services/timesheet.service.js";
import { TimesheetRepository } from "../repositories/timesheet.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { TimesheetAdapter } from "../integrations/timesheet/timesheet.adapter.js";
import { successResponse } from "../utils/response.js";

function getTimesheetService(): TimesheetService {
  return new TimesheetService(
    new TimesheetRepository(),
    new EmployeeRepository(),
    new TimesheetAdapter()
  );
}

export const timesheetController = {
  getStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getTimesheetService();
      const status = await service.getStatus(req.params.employeeId);
      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  },

  provision: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getTimesheetService();
      const status = await service.provision(
        req.params.employeeId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  },

  disable: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getTimesheetService();
      const status = await service.disable(
        req.params.employeeId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(status));
    } catch (error) {
      next(error);
    }
  }
};
