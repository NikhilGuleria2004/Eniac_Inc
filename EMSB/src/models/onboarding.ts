import type { ObjectId } from "mongodb";

export type OnboardingStage =
  | "EMPLOYEE_INFORMATION"
  | "EMPLOYMENT_DETAILS"
  | "GEOGRAPHY"
  | "BILLING_CLASSIFICATION"
  | "DOCUMENTS"
  | "HR_REVIEW"
  | "ACTIVATION"
  | "TIMESHEET_ELIGIBILITY";

export type OnboardingStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "AWAITING_REVIEW"
  | "REVIEWED"
  | "REJECTED"
  | "COMPLETED";

export interface OnboardingDocumentRequirement {
  type: string;
  name: string;
  required: boolean;
  uploaded: boolean;
}

export interface OnboardingRecord {
  _id: ObjectId;
  employeeId: string;
  currentStage: OnboardingStage;
  status: OnboardingStatus;
  completedStages: OnboardingStage[];
  documentRequirements: OnboardingDocumentRequirement[];
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
