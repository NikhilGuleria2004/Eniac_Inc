import type { ObjectId } from "mongodb";
import type { SettingCategory } from "../config/constants.js";

export interface Setting {
  _id: ObjectId;
  key: string;
  category: SettingCategory;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
