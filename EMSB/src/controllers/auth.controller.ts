import type { Request, Response, NextFunction } from "express";
import { loginSchema, refreshSchema } from "../schemas/auth.schemas.js";
import { ValidationError } from "../utils/errors.js";
import { successResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { AuthService } from "../services/auth.service.js";
import { UserRepository } from "../repositories/user.repository.js";

function getAuthService(): AuthService {
  const userRepository = new UserRepository();
  return new AuthService(userRepository);
}

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const { email, password } = result.data;
      const authService = getAuthService();

      const authResult = await authService.login(email, password);

      res.status(200).json(
        successResponse({
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresIn: authResult.expiresIn,
          user: authResult.user
        })
      );
    } catch (error) {
      next(error);
    }
  },

  logout: async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(successResponse({ message: "Logged out successfully." }));
  },

  me: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ValidationError("Authentication required.");
      }

      const authService = getAuthService();
      const user = await authService.getMe(req.user.userId);

      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = refreshSchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const authService = getAuthService();
      const authResult = await authService.refresh(result.data.refreshToken);

      res.json(
        successResponse({
          accessToken: authResult.accessToken,
          expiresIn: authResult.expiresIn
        })
      );
    } catch (error) {
      next(error);
    }
  }
};
