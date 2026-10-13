import { z } from "zod";
import type { SettingCategory } from "../config/constants.js";

export const settingsListQuerySchema = z.object({
  category: z.string().optional()
});

export type SettingsListQuery = z.infer<typeof settingsListQuerySchema>;

const settingUpdateItemSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  category: z.string(),
  description: z.string().optional()
});

export const settingsUpdateSchema = z.object({
  settings: z.array(settingUpdateItemSchema)
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export interface SettingDTO {
  key: string;
  category: SettingCategory;
  value: unknown;
  description?: string;
  updatedAt: string;
  updatedBy?: string;
}
