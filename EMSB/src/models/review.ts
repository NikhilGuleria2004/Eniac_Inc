import type { ObjectId } from "mongodb";

export type ReviewStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ACKNOWLEDGED";

export interface EmployeeReview {
  _id: ObjectId;
  reviewId: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  rating?: number;
  strengths?: string;
  improvementAreas?: string;
  goals?: string;
  comments?: string;
  status: ReviewStatus;
  reviewDate?: Date;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
