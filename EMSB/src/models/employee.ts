import type { ObjectId, Decimal128 } from "mongodb";
import type {
  EmploymentStatus,
  BillingStatus
} from "../config/constants.js";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";

export interface EmployeeCompensation {
  currency?: string;
  salary?: number | Decimal128;
  payFrequency?: "MONTHLY" | "YEARLY" | "HOURLY";
}

export interface EmployeeBillRate {
  currency?: string;
  amount?: number | Decimal128;
  unit?: "HOURLY" | "DAILY" | "MONTHLY";
}

export interface TimesheetEligibility {
  eligible: boolean;
  eligibleAt?: Date;
  reason?: string;
}

export interface EmployeeAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface Employee {
  _id: ObjectId;
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: Date;
  designation: string;
  department: string;
  managerId?: string;
  country: string;
   employmentStatus: EmploymentStatus;
   billingStatus: BillingStatus;
   workMail?: string;
   joiningDate?: Date;
  employmentType?: EmploymentType;
  address?: EmployeeAddress;
  emergencyContact?: EmergencyContact;
  compensation?: EmployeeCompensation;
  billRate?: EmployeeBillRate;
  timesheetEligibility?: TimesheetEligibility;
  createdAt: Date;
  updatedAt: Date;
}
