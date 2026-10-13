import type { ObjectId } from "mongodb";

export type LeaveType = "PAID" | "SICK" | "CASUAL" | "UNPAID";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveTypeConfig {
  _id: ObjectId;
  typeId: string;
  code: LeaveType;
  name: string;
  annualAllowance?: number;
  requiresApproval: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequest {
  _id: ObjectId;
  requestId: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  _id: ObjectId;
  employeeId: string;
  leaveType: LeaveType;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}
