import type { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analytics.service.js";
import { successResponse } from "../utils/response.js";
import { AuthorizationError } from "../utils/errors.js";

function getService(): AnalyticsService {
  return new AnalyticsService();
}

// Analytics is a CMS module. `report.view` is shared with the EMS reporting
// routes, so HR must be rejected here explicitly rather than by permission.
function assertCmsAccess(req: Request): void {
  if (req.user?.role === "HR") {
    throw new AuthorizationError("The HR role has no access to CMS analytics.");
  }
}

const wrap = (
  handler: (req: Request) => Promise<unknown>
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCmsAccess(req);
    res.json(successResponse(await handler(req)));
  } catch (error) {
    next(error);
  }
};

export const analyticsController = {
  timesheetKpis: wrap(() => getService().timesheetKpis()),
  invoiceKpis: wrap(() => getService().invoiceKpis()),
  revenueTrend: wrap(() => getService().revenueTrend()),
  topClients: wrap(() => getService().topClients()),
  submissionRate: wrap(() => getService().submissionRate()),
  overview: wrap(() => getService().overview()),
};
