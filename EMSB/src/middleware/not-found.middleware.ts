import type { Request, Response, NextFunction } from "express";

export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const fullPath = req.baseUrl + req.path;

  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${fullPath} not found.`
    }
  });
}
