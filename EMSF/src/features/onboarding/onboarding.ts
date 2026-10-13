import type { Document, Employee } from "../../types";

/** A single onboarding workflow step for one employee. */
export interface OnboardingStep {
  key: string;
  label: string;
  status: "complete" | "current" | "pending";
  detail: string;
}

export interface OnboardingRecord {
  employee: Employee;
  progress: number;
  currentStage: string;
  steps: OnboardingStep[];
}

/**
 * Derive the 8-step onboarding workflow (§39) from real mock data:
 * 1 Employee Information, 2 Employment Details, 3 Geography,
 * 4 Billing Classification, 5 Documents, 6 HR Review, 7 Activation,
 * 8 Timesheet Eligibility.
 */
export function getOnboardingStepData(
  employee: Employee,
  documents: Document[]
): OnboardingStep[] {
  const docs = documents.filter((d) => d.employeeId === employee.id);
  const approvedDocs = docs.filter((d) => d.status === "APPROVED").length;
  const pendingDocs = docs.filter(
    (d) => d.status === "PENDING" || d.status === "UNDER_REVIEW"
  ).length;
  const activated =
    employee.employmentStatus === "ACTIVE" ||
    employee.employmentStatus === "ON_LEAVE";
  const eligible = employee.timesheetEligibility === "ELIGIBLE" || employee.timesheetEligibility === "PROVISIONED";

  const complete = (label: string, detail: string): OnboardingStep => ({
    key: label,
    label,
    status: "complete",
    detail,
  });
  const current = (label: string, detail: string): OnboardingStep => ({
    key: label,
    label,
    status: "current",
    detail,
  });
  const pending = (label: string, detail: string): OnboardingStep => ({
    key: label,
    label,
    status: "pending",
    detail,
  });

  // Linear workflow: each step completes only if all previous steps complete.
  const hasInfo = Boolean(employee.firstName && employee.lastName && employee.email);
  const hasEmployment = Boolean(employee.designation && employee.department && employee.joiningDate);
  const hasGeo = Boolean(employee.country && employee.city);
  const hasBilling = Boolean(employee.billingStatus);
  const docsDone = docs.length > 0 && pendingDocs === 0;
  const hrDone = docsDone && approvedDocs > 0;

  const steps: OnboardingStep[] = [];
  steps.push(
    hasInfo
      ? complete("Employee Information", `${employee.firstName} ${employee.lastName} — ${employee.email}`)
      : current("Employee Information", "Missing basic information")
  );
  if (!hasInfo) {
    return fillPending(steps);
  }
  steps.push(
    hasEmployment
      ? complete("Employment Details", `${employee.designation} — ${employee.department}`)
      : current("Employment Details", "Employment details incomplete")
  );
  if (!hasEmployment) {
    return fillPending(steps);
  }
  steps.push(
    hasGeo
      ? complete("Geography", `${employee.city}, ${employee.country}`)
      : current("Geography", "Location not set")
  );
  if (!hasGeo) {
    return fillPending(steps);
  }
  steps.push(
    hasBilling
      ? complete(
          "Billing Classification",
          employee.billingStatus === "BILLABLE"
            ? "Billable — timesheet track"
            : "Non-Billable — no auto-provisioning"
        )
      : current("Billing Classification", "Billing not classified")
  );
  if (!hasBilling) {
    return fillPending(steps);
  }
  steps.push(
    docs.length === 0
      ? current("Documents", "No documents uploaded yet")
      : docsDone
        ? complete("Documents", `${approvedDocs} approved document(s)`)
        : current("Documents", `${pendingDocs} document(s) awaiting review`)
  );
  if (!docsDone) {
    return fillPending(steps);
  }
  steps.push(
    hrDone
      ? complete("HR Review", "HR review completed")
      : current("HR Review", "Awaiting HR review")
  );
  if (!hrDone) {
    return fillPending(steps);
  }
  steps.push(
    activated
      ? complete("Activation", `Status: ${employee.employmentStatus}`)
      : current("Activation", "Account not yet activated")
  );
  if (!activated) {
    steps.push(pending("Timesheet Eligibility", "Available after activation"));
    return steps;
  }
  steps.push(
    eligible
      ? complete("Timesheet Eligibility", `ELIGIBLE — ${employee.timesheetEligibility}`)
      : complete("Timesheet Eligibility", "NOT ELIGIBLE (non-billable or inactive)")
  );
  return steps;
}

function fillPending(steps: OnboardingStep[]): OnboardingStep[] {
  const labels = [
    "Employee Information",
    "Employment Details",
    "Geography",
    "Billing Classification",
    "Documents",
    "HR Review",
    "Activation",
    "Timesheet Eligibility",
  ];
  for (const label of labels) {
    if (!steps.some((s) => s.key === label)) {
      steps.push({ key: label, label, status: "pending", detail: "Locked until previous steps complete" });
    }
  }
  return steps;
}

/** Percentage of completed steps (0–100). */
export function getOnboardingProgress(steps: OnboardingStep[]): number {
  const done = steps.filter((s) => s.status === "complete").length;
  return Math.round((done / steps.length) * 100);
}

/** Human-readable current stage = first non-complete step, or Completed. */
export function getOnboardingStage(steps: OnboardingStep[]): string {
  const cur = steps.find((s) => s.status !== "complete");
  return cur ? cur.label : "Completed";
}

/** Target date = joining date + 14 days (mock SLA). */
export function getOnboardingTargetDate(employee: Employee): string {
  const d = new Date(employee.joiningDate);
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}
