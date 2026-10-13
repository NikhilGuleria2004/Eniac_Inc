import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/errors.js";
import { errorResponse } from "../utils/response.js";
import { env } from "../config/env.js";
import { logger } from "../logger/logger.js";

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ValidationError) {
    logger.warn({
      requestId: req.requestId,
      userId: req.user?.userId,
      error: {
        code: error.code,
        message: error.message,
        stack: env.NODE_ENV === "development" ? error.stack : undefined
      }
    });

    res.status(error.statusCode).json(errorResponse(error.code, error.message, error.fields));
    return;
  }

  if (error instanceof AppError) {
    logger.warn({
      requestId: req.requestId,
      userId: req.user?.userId,
      error: {
        code: error.code,
        message: error.message,
        stack: env.NODE_ENV === "development" ? error.stack : undefined
      }
    });

    res.status(error.statusCode).json(errorResponse(error.code, error.message));
    return;
  }

  if (error instanceof Error) {
    logger.error({
      requestId: req.requestId,
      userId: req.user?.userId,
      error: {
        message: error.message,
        stack: env.NODE_ENV === "development" ? error.stack : undefined
      }
    });

    res.status(500).json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        env.NODE_ENV === "development" ? error.message : "An unexpected error occurred."
      )
    );
    return;
  }

  logger.error({
    requestId: req.requestId,
    error: "Unknown error type"
  });

  res.status(500).json(errorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred."));
}
