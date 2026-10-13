import type { ObjectId } from "mongodb";

export type AttendanceStatus = "P" | "A" | "L" | "LV" | "M";

export type AttendanceCorrectionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface AttendanceRecord {
  _id: ObjectId;
  attendanceId: string;
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: AttendanceStatus;
  totalMinutes?: number;
  workingHours?: number;
  notes?: string;
  correctionRequested?: boolean;
  correctionResolution?: "APPROVED" | "REJECTED";
  correctionComment?: string;
  correctionReviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceCorrection {
  _id: ObjectId;
  correctionId: string;
  attendanceId: string;
  employeeId: string;
  reason: string;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  status: AttendanceCorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  createdAt: Date;
  updatedAt: Date;
}
