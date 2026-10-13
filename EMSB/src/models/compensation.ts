import type { ObjectId, Decimal128 } from "mongodb";

export type PayFrequency = "MONTHLY" | "YEARLY" | "HOURLY";
export type BillRateUnit = "HOURLY" | "DAILY" | "MONTHLY";

export interface Compensation {
  currency: string;
  salary: Decimal128;
  payFrequency: PayFrequency;
}

export interface BillRate {
  currency: string;
  amount: Decimal128;
  unit: BillRateUnit;
}

export interface CompensationHistory {
  _id: ObjectId;
  historyId: string;
  employeeId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  salary: Decimal128;
  currency: string;
  payFrequency: PayFrequency;
  changedBy: string;
  reason?: string;
  createdAt: Date;
}

export interface BillRateHistory {
  _id: ObjectId;
  historyId: string;
  employeeId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  billRate: Decimal128;
  currency: string;
  unit: BillRateUnit;
  changedBy: string;
  reason?: string;
  createdAt: Date;
}
