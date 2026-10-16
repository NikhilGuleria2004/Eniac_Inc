import type { ObjectId } from "mongodb";

export type AssignmentStatus = "ACTIVE" | "PENDING" | "ENDED" | "CANCELLED";

export interface ProjectAssignment {
  _id: ObjectId;
  assignmentId: string;
  employeeId: string;
  projectId: string;
  role?: string;
  allocationPercent: number;
  billable: boolean;
  startDate: Date;
  endDate?: Date;
  status: AssignmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
