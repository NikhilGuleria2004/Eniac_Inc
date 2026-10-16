import type { Request, Response, NextFunction } from "express";
import { runRequestContext, type RequestContext } from "../utils/request-context.js";

export function auditContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const context: RequestContext = {
    requestId: req.requestId,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent") ?? undefined
  };

  runRequestContext(context, () => next());
}
