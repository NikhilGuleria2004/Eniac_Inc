import type { ObjectId } from "mongodb";
import type { TimesheetStatus } from "../config/constants.js";

export interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  employeeBillRate: number;
  billableHours: number;
  billableAmount: number;
}

// Billing timesheet — distinct from EMSB's timesheet *provisioning* module
// (src/services/timesheet.service.ts), which stays unchanged.
export interface Timesheet {
  _id: ObjectId;
  timesheetId: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  billingPeriod: number;
  year: number;
  month: number;
  totalDays: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  totalHours: number;
  billableAmount: number;
  currency: string;
  status: TimesheetStatus;
  submittedAt?: Date;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvedAt?: Date;
  paidAt?: Date;
  dailyLogIds: string[];
  projectBreakdown: ProjectBreakdown[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
