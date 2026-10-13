import type { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service.js";
import { successResponse } from "../utils/response.js";

function getDashboardService(): DashboardService {
  return new DashboardService();
}

export const dashboardController = {
  getDashboard: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const role = req.user?.role;

      let data: unknown;

      switch (role) {
        case "ADMIN":
          data = await service.getAdminDashboard();
          break;
        case "HR":
          data = await service.getHRDashboard();
          break;
        case "MANAGER":
          data = await service.getManagerDashboard();
          break;
        case "SUPERVISOR":
          data = await service.getSupervisorDashboard(req.user?.employeeId);
          break;
        case "EMPLOYEE":
          data = await service.getEmployeeDashboard(req.user?.employeeId!);
          break;
        default:
          data = null;
      }

      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  getAdminDashboard: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const data = await service.getAdminDashboard();
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  getHRDashboard: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const data = await service.getHRDashboard();
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  getManagerDashboard: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const data = await service.getManagerDashboard();
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  getSupervisorDashboard: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const data = await service.getSupervisorDashboard(req.user?.employeeId);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  getEmployeeDashboard: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getDashboardService();
      const data = await service.getEmployeeDashboard(req.user?.employeeId!);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  }
};
