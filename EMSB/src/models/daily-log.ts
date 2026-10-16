import type { ObjectId } from "mongodb";
import type { TaskCategory } from "../config/constants.js";

export type DailyLogStatus = "DRAFT" | "SUBMITTED" | "LOCKED";
export type BillingType = "BILLABLE" | "NON_BILLABLE";

export interface DailyLog {
  _id: ObjectId;
  dailyLogId: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  workDate: Date;
  workDateStr: string;
  dayOfWeek: string;
  taskCategory: TaskCategory;
  description: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  billable: boolean;
  billingType: BillingType;
  status: DailyLogStatus;
  timesheetId?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  tags?: string[];
  deletedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
