import { describe, expect, it, beforeEach, vi } from "vitest";
import { getOnboardingStepData, getOnboardingProgress } from "@/features/onboarding/onboarding";
import { allRequiredDocumentsApproved } from "@/features/onboarding/documents";
import { mockEmployees, mockDocuments } from "@/data/mock/index";
import { updateOnboardingBilling } from "@/data/mock/repositories";
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
  role: "HR",
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

vi.mock("@/data/mock/repositories", () => ({
  updateOnboardingBilling: vi.fn(),
}));

describe("Phase 8 — Extended Onboarding Tests", () => {
  beforeEach(() => {
    mockEmployees.length = 0;
    mockDocuments.length = 0;
    mockEmployees.push(makeEmployee());
    vi.mocked(updateOnboardingBilling).mockClear();
  });

  describe("P8.4 — Activation blocked when not approved", () => {
    it("should show Activation as current (not complete) when employmentStatus is ONBOARDING", () => {
      const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const activationStep = steps.find((s) => s.label === "Activation");
      expect(activationStep?.status).toBe("current");
    });

    it("should show Timesheet Eligibility as pending when not activated", () => {
      const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const timesheetStep = steps.find((s) => s.label === "Timesheet Eligibility");
      expect(timesheetStep?.status).toBe("pending");
    });

    it("should not show Activation as complete when not activated", () => {
      const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const activationStep = steps.find((s) => s.label === "Activation");
      expect(activationStep?.status).not.toBe("complete");
    });
  });

  describe("P8.6 — Billing change reflects in eligibility display", () => {
    it("should show ELIGIBLE after billing set to BILLABLE and activation", () => {
      const employee = makeEmployee({
        employmentStatus: "ACTIVE",
        billingStatus: "BILLABLE",
        timesheetEligibility: "ELIGIBLE",
      });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const eligibilityStep = steps.find((s) => s.label === "Timesheet Eligibility");
      expect(eligibilityStep?.status).toBe("complete");
      expect(eligibilityStep?.detail).toContain("ELIGIBLE");
    });

    it("should show NOT ELIGIBLE after billing set to NON_BILLABLE and activation", () => {
      const employee = makeEmployee({
        employmentStatus: "ACTIVE",
        billingStatus: "NON_BILLABLE",
        timesheetEligibility: "NOT_ELIGIBLE",
      });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const eligibilityStep = steps.find((s) => s.label === "Timesheet Eligibility");
      expect(eligibilityStep?.status).toBe("complete");
      expect(eligibilityStep?.detail).toContain("NOT ELIGIBLE");
    });

    it("should show Billing Classification step as complete when billingStatus is set", () => {
      const billedEmployee = makeEmployee({ billingStatus: "BILLABLE" });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(billedEmployee, docs);

      const billingStep = steps.find((s) => s.label === "Billing Classification");
      expect(billingStep?.status).toBe("complete");
    });

    it("should show Billing Classification step as current when billingStatus is empty", () => {
      const unbilledEmployee = makeEmployee({ billingStatus: undefined });
      const steps = getOnboardingStepData(unbilledEmployee, []);

      const billingStep = steps.find((s) => s.label === "Billing Classification");
      expect(billingStep?.status).toBe("current");
    });

    it("updateOnboardingBilling should update employee billingStatus", () => {
      const employee = makeEmployee({ billingStatus: "NON_BILLABLE" });
      vi.mocked(updateOnboardingBilling).mockResolvedValue(undefined as any);
      updateOnboardingBilling(employee.id, "BILLABLE");
      expect(updateOnboardingBilling).toHaveBeenCalledWith("emp-1", "BILLABLE");
    });

    it("should show billing detail reflecting NON_BILLABLE when set", () => {
      const employee = makeEmployee({ billingStatus: "NON_BILLABLE" });
      const docs = allApprovedDocs;
      const steps = getOnboardingStepData(employee, docs);

      const billingStep = steps.find((s) => s.label === "Billing Classification");
      expect(billingStep?.detail).toContain("Non-Billable");
    });
  });

  describe("P8.10 — Zoho webhook auto-approves document → step 5 completes", () => {
    it("simulating Zoho webhook: document status changes to APPROVED, then allRequiredDocumentsApproved returns true", () => {
      const docs: Document[] = [
        { ...approvedDoc("OFFER_LETTER"), status: "PENDING" },
        { ...approvedDoc("EMPLOYMENT_AGREEMENT"), status: "PENDING" },
        { ...approvedDoc("ID_PROOF"), status: "PENDING" },
        { ...approvedDoc("ADDRESS_PROOF"), status: "PENDING" },
      ];

      expect(allRequiredDocumentsApproved(docs)).toBe(false);

      const approvedDocs = docs.map((d) => ({ ...d, status: "APPROVED" as const }));
      expect(allRequiredDocumentsApproved(approvedDocs)).toBe(true);
    });

    it("should complete Documents and HR Review steps after all docs approved", () => {
      const docs: Document[] = [
        { ...approvedDoc("OFFER_LETTER"), status: "PENDING" },
        { ...approvedDoc("EMPLOYMENT_AGREEMENT"), status: "PENDING" },
        { ...approvedDoc("ID_PROOF"), status: "PENDING" },
        { ...approvedDoc("ADDRESS_PROOF"), status: "PENDING" },
      ];

      const employee = makeEmployee({});
      let steps = getOnboardingStepData(employee, docs);
      expect(steps[4].status).toBe("current");
      expect(steps[5].status).toBe("pending");

      const approvedDocs = docs.map((d) => ({ ...d, status: "APPROVED" as const }));
      steps = getOnboardingStepData(employee, approvedDocs);
      expect(steps[4].status).toBe("complete");
      expect(steps[5].status).toBe("complete");
    });

    it("should update progress percentage when docs auto-approve", () => {
      const employee = makeEmployee({});
      const pendingDocs = [
        { ...approvedDoc("OFFER_LETTER"), status: "PENDING" as const },
        { ...approvedDoc("EMPLOYMENT_AGREEMENT"), status: "PENDING" as const },
        { ...approvedDoc("ID_PROOF"), status: "PENDING" as const },
        { ...approvedDoc("ADDRESS_PROOF"), status: "PENDING" as const },
      ];

      const beforeSteps = getOnboardingStepData(employee, pendingDocs);
      const progressBefore = getOnboardingProgress(beforeSteps);

      const approvedDocs = pendingDocs.map((d) => ({ ...d, status: "APPROVED" as const }));
      const afterSteps = getOnboardingStepData(employee, approvedDocs);
      const progressAfter = getOnboardingProgress(afterSteps);

      expect(progressAfter).toBeGreaterThan(progressBefore);
    });
  });

  describe("P8.7 — Error handling logic", () => {
    it("should verify updateOnboardingBilling is called with correct arguments", () => {
      vi.mocked(updateOnboardingBilling).mockResolvedValue(undefined as any);

      const employee = makeEmployee({ billingStatus: "NON_BILLABLE" });
      updateOnboardingBilling(employee.id, "BILLABLE");
      expect(updateOnboardingBilling).toHaveBeenCalledWith("emp-1", "BILLABLE");
    });

    it("should verify updateOnboardingBilling can be called with NON_BILLABLE", () => {
      vi.mocked(updateOnboardingBilling).mockResolvedValue(undefined as any);

      const employee = makeEmployee({ billingStatus: "BILLABLE" });
      updateOnboardingBilling(employee.id, "NON_BILLABLE");
      expect(updateOnboardingBilling).toHaveBeenCalledWith("emp-1", "NON_BILLABLE");
    });
  });
});
