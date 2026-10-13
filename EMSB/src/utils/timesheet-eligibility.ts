export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

interface EligibilityEmployee {
  employmentStatus: string;
  billingStatus: string;
  timesheetEligibility?: { eligible?: boolean; reason?: string };
}

/**
 * Single source of truth for timesheet eligibility.
 *
 * An employee is eligible when ALL of:
 *   - employmentStatus === "ACTIVE"
 *   - billingStatus === "BILLABLE"
 *   - onboarding has completed (resolved by the caller — EmployeeService
 *     batch-fetches it for list/detail; TimesheetService queries it directly)
 *   - no stored provisioning failure blocks them (employee.timesheetEligibility)
 *
 * Used by both TimesheetService.calculateEligibility (the /timesheet endpoint and
 * the eligibility-changed listener) and EmployeeService.isTimesheetEligible (the
 * employee DTO), so the two can never disagree (Finding #2).
 */
export function computeTimesheetEligibility(
  employee: EligibilityEmployee,
  onboardingCompleted: boolean
): EligibilityResult {
  if (employee.employmentStatus !== "ACTIVE") {
    return {
      eligible: false,
      reason: `Employee status is ${employee.employmentStatus}, not ACTIVE`
    };
  }
  if (employee.billingStatus !== "BILLABLE") {
    return { eligible: false, reason: "Employee is not BILLABLE" };
  }
  if (!onboardingCompleted) {
    return { eligible: false, reason: "Onboarding is not complete" };
  }
  const flag = employee.timesheetEligibility;
  if (flag && flag.eligible !== true) {
    return {
      eligible: false,
      reason: flag.reason ?? "Provisioning failed"
    };
  }
  return { eligible: true };
}
