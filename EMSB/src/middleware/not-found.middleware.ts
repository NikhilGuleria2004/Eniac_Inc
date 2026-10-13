import type { Request, Response, NextFunction } from "express";
import { API_BASE } from "../config/constants.js";

export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const fullPath = req.baseUrl + req.path;

  if (fullPath.startsWith(API_BASE) || fullPath === "/") {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${fullPath} not found.`
      }
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${fullPath} not found.`
      }
    });
  }
}
