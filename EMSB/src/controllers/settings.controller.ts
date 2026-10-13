import type { Request, Response, NextFunction } from "express";
import { SettingsService } from "../services/settings.service.js";
import { SettingsRepository } from "../repositories/settings.repository.js";
import { z } from "zod";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { successResponse } from "../utils/response.js";
import type { Role } from "../config/constants.js";
import type { SettingsListQuery, SettingsUpdateInput } from "../schemas/settings.schemas.js";

const settingsListQuerySchema = z.object({
  category: z.string().optional()
});

const settingsUpdateBodySchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.unknown(),
      category: z.string(),
      description: z.string().optional()
    })
  )
});

function getSettingsService(): SettingsService {
  return new SettingsService(new SettingsRepository());
}

export const settingsController = {
  getSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getSettingsService();
      const result = settingsListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const grouped = await service.getSettingsGrouped(result.data as SettingsListQuery);
      res.json(successResponse(grouped));
    } catch (error) {
      next(error);
    }
  },

  updateSettings: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getSettingsService();
      const actorRole = req.user?.role as Role;
      const actorUserId = req.user?.userId ?? "unknown";

      const result = settingsUpdateBodySchema.safeParse(req.body);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const updated = await service.updateSettings(result.data as SettingsUpdateInput, actorRole, actorUserId);
      res.json(successResponse(updated));
    } catch (error) {
      next(error);
    }
  }
};
