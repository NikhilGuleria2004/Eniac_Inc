import type { ObjectId } from "mongodb";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

export interface Project {
  _id: ObjectId;
  projectId: string;
  clientId: string;
  name: string;
  code?: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
  progressPercent?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
