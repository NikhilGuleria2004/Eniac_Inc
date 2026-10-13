import { describe, expect, it, beforeEach } from "vitest";
import { getOnboardingStepData } from "@/features/onboarding/onboarding";
import { allRequiredDocumentsApproved, getRequiredDocumentStatuses } from "@/features/onboarding/documents";
import { mockEmployees } from "@/data/mock/index";
import type { Document, Employee } from "@/types";

const makeEmployee = (overrides: Partial<Employee>): Employee => ({
  id: "emp-1",
  employeeCode: "EMP-001",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+1 555-0001",
  avatar: "https://example.com/avatar.png",
  designation: "Engineer",
  department: "Engineering",
  country: "United States",
  state: "California",
  city: "San Francisco",
  employmentStatus: "ONBOARDING",
  employmentType: "FULL_TIME",
  billingStatus: "BILLABLE",
  joiningDate: "2026-10-15",
  managerId: "mgr-1",
  timesheetEligibility: "NOT_ELIGIBLE",
  role: "ADMIN",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

const approvedDoc = (type: Document["type"]): Document => ({
  id: `doc-${type}`,
  employeeId: "emp-1",
  name: `${type} Doc`,
  type,
  uploadedAt: "2026-10-01T00:00:00Z",
  status: "APPROVED",
});

const allApprovedDocs: Document[] = [
  approvedDoc("OFFER_LETTER"),
  approvedDoc("EMPLOYMENT_AGREEMENT"),
  approvedDoc("ID_PROOF"),
  approvedDoc("ADDRESS_PROOF"),
];

describe("Onboarding Wizard Flow (P8.2)", () => {
  beforeEach(() => {
    mockEmployees.length = 0;
    mockEmployees.push(makeEmployee({ firstName: "John", lastName: "Doe", email: "john@example.com" }));
  });

  it("should have all 8 steps defined with correct labels", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      timesheetEligibility: "ELIGIBLE",
    });
    const docs = allApprovedDocs;
    const steps = getOnboardingStepData(employee, docs);

    expect(steps).toHaveLength(8);
    expect(steps.map((s) => s.label)).toEqual([
      "Employee Information",
      "Employment Details",
      "Geography",
      "Billing Classification",
      "Documents",
      "HR Review",
      "Activation",
      "Timesheet Eligibility",
    ]);

    expect(steps.every((s) => s.status === "complete")).toBe(true);
  });

  it("should block approval when docs incomplete (P8.3)", () => {
    const docs: Document[] = [
      approvedDoc("OFFER_LETTER"),
    ];
    expect(allRequiredDocumentsApproved(docs)).toBe(false);
    const statuses = getRequiredDocumentStatuses(docs);
    expect(statuses.find((s) => s.type === "EMPLOYMENT_AGREEMENT")?.hasDoc).toBe(false);
  });

  it("should show NOT_ELIGIBLE when non-billable after activation", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "NON_BILLABLE",
      timesheetEligibility: "NOT_ELIGIBLE",
    });
    const docs = allApprovedDocs;
    const steps = getOnboardingStepData(employee, docs);

    const activationStep = steps.find((s) => s.label === "Activation");
    const timesheetStep = steps.find((s) => s.label === "Timesheet Eligibility");

    expect(activationStep?.status).toBe("complete");
    expect(timesheetStep?.status).toBe("complete");
    expect(timesheetStep?.detail).toContain("NOT ELIGIBLE");
  });

  it("should block HR Review when docs incomplete (P8.3)", () => {
    const employee = makeEmployee({});
    const docs: Document[] = [];
    const steps = getOnboardingStepData(employee, docs);

    expect(steps[4].status).toBe("current");
    expect(steps[5].status).toBe("pending");
  });

  it("should complete all steps when activated + docs approved (happy path P8.2)", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      timesheetEligibility: "ELIGIBLE",
    });
    const docs = allApprovedDocs;
    const steps = getOnboardingStepData(employee, docs);

    expect(steps[4].status).toBe("complete");
    expect(steps[5].status).toBe("complete");
    expect(steps[6].status).toBe("complete");
    expect(steps[7].status).toBe("complete");
  });
});
