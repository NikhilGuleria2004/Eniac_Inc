import type { Employee } from "../../types";

/**
 * Phase 9 — deterministic mock compensation derived from employee id.
 * No backend yet; values are stable placeholders clearly labeled "Mock".
 */
export interface MockCompensation {
  payRate: number;
  payFrequency: "MONTHLY" | "HOURLY";
  currency: string;
  billRate?: number;
  isMock: true;
}

export function getMockCompensation(emp: Employee): MockCompensation {
  let hash = 0;
  for (let i = 0; i < emp.id.length; i++) {
    hash = (hash * 31 + emp.id.charCodeAt(i)) >>> 0;
  }
  const indian = emp.country === "India";
  const senior = /Senior|Lead|Manager|Architect/i.test(emp.designation);
  const base = indian ? 60000 + (hash % 90000) : 70000 + (hash % 80000);
  const payRate = senior ? Math.round(base * 1.5) : base;
  const billRate =
    emp.billingStatus === "BILLABLE"
      ? Math.round(payRate * (indian ? 1.4 : 1.8))
      : undefined;
  return {
    payRate,
    payFrequency: indian ? "MONTHLY" : "MONTHLY",
    currency: indian ? "INR" : "USD",
    billRate,
    isMock: true,
  };
}
