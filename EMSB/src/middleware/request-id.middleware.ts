import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? uuidv4();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}
