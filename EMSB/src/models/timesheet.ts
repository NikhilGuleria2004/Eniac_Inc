import type { ObjectId } from "mongodb";

export type TimesheetProvisioningStatus =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "PENDING"
  | "PROVISIONING"
  | "PROVISIONED"
  | "FAILED"
  | "DISABLED";

export interface TimesheetProvisioning {
  _id: ObjectId;
  employeeId: string;
  status: TimesheetProvisioningStatus;
  eligible: boolean;
  failureReason?: string;
  lastAttemptAt?: Date;
  provisionedAt?: Date;
  disabledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
