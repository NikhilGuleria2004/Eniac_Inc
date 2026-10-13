import { describe, expect, it } from "vitest";
import { getOnboardingStepData, getOnboardingStage, getOnboardingProgress } from "@/features/onboarding/onboarding";
import type { Employee, Document } from "@/types";

const baseEmployee = (overrides: Partial<Employee>): Employee => ({
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
  timesheetEligibility: "ELIGIBLE",
  role: "EMPLOYEE",
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

describe("onboarding step data", () => {
  describe("getOnboardingStepData", () => {
    it("should mark all steps as pending when employee has no data", () => {
      const employee = baseEmployee({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
      const steps = getOnboardingStepData(employee, []);
      expect(steps[0].status).toBe("current");
      expect(steps.every((s) => s.status === "pending")).toBe(false);
      expect(steps.slice(1).every((s) => s.status === "pending")).toBe(true);
    });

    it("should mark step 1 complete when basic info exists", () => {
      const steps = getOnboardingStepData(baseEmployee({}), []);
      expect(steps[0].status).toBe("complete");
    });

    it("should mark steps 1-4 complete when all data present", () => {
      const steps = getOnboardingStepData(baseEmployee({}), []);
      expect(steps[0].status).toBe("complete");
      expect(steps[1].status).toBe("complete");
      expect(steps[2].status).toBe("complete");
      expect(steps[3].status).toBe("complete");
    });

    it("should set documents step to current when no docs", () => {
      const steps = getOnboardingStepData(baseEmployee({}), []);
      expect(steps[4].label).toBe("Documents");
      expect(steps[4].status).toBe("current");
    });

    it("should set documents step to complete when all required docs approved", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(baseEmployee({}), docs);
      expect(steps[4].status).toBe("complete");
    });

    it("should set HR Review to complete when docs approved", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(baseEmployee({}), docs);
      expect(steps[5].label).toBe("HR Review");
      expect(steps[5].status).toBe("complete");
    });

    it("should mark Activation as current when not activated", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(
        baseEmployee({ employmentStatus: "ONBOARDING" }),
        docs
      );
      expect(steps[6].status).toBe("current");
    });

    it("should mark Activation as complete and Timesheet as complete when activated", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(
        baseEmployee({ employmentStatus: "ACTIVE", timesheetEligibility: "ELIGIBLE" }),
        docs
      );
      expect(steps[6].status).toBe("complete");
      expect(steps[7].status).toBe("complete");
      expect(steps[7].detail).toContain("ELIGIBLE");
    });

    it("should mark Timesheet as complete with NOT ELIGIBLE for non-billable", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(
        baseEmployee({
          employmentStatus: "ACTIVE",
          billingStatus: "NON_BILLABLE",
          timesheetEligibility: "NOT_ELIGIBLE",
        }),
        docs
      );
      expect(steps[7].status).toBe("complete");
      expect(steps[7].detail).toContain("NOT ELIGIBLE");
    });
  });

  describe("getOnboardingStage", () => {
    it("should return current stage from first non-complete step", () => {
      const steps = getOnboardingStepData(baseEmployee({}), []);
      expect(getOnboardingStage(steps)).toBe("Documents");
    });

    it("should return 'Completed' when all steps complete", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(
        baseEmployee({ employmentStatus: "ACTIVE", timesheetEligibility: "ELIGIBLE" }),
        docs
      );
      expect(getOnboardingStage(steps)).toBe("Completed");
    });
  });

  describe("getOnboardingProgress", () => {
    it("should return 0% when no steps complete", () => {
      const steps = getOnboardingStepData(
        baseEmployee({ firstName: "", lastName: "", email: "" }),
        []
      );
      expect(getOnboardingProgress(steps)).toBe(0);
    });

    it("should return 100% when all steps complete", () => {
      const docs = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        approvedDoc("ID_PROOF"),
        approvedDoc("ADDRESS_PROOF"),
      ];
      const steps = getOnboardingStepData(
        baseEmployee({ employmentStatus: "ACTIVE", timesheetEligibility: "ELIGIBLE" }),
        docs
      );
      expect(getOnboardingProgress(steps)).toBe(100);
    });
  });

  describe("approval blocked when docs incomplete (P7.5 / P8.3)", () => {
    it("should have Documents as current (not complete) when docs are missing", () => {
      const docs: Document[] = [];
      const steps = getOnboardingStepData(baseEmployee({}), docs);
      expect(steps[4].status).toBe("current");
      expect(steps[5].status).toBe("pending");
    });

    it("should not reach HR Review when docs incomplete", () => {
      const docs: Document[] = [
        approvedDoc("OFFER_LETTER"),
        approvedDoc("EMPLOYMENT_AGREEMENT"),
        { ...approvedDoc("ID_PROOF"), status: "PENDING" },
      ];
      const steps = getOnboardingStepData(baseEmployee({}), docs);
      expect(steps[4].status).toBe("current");
      expect(steps[5].status).toBe("pending");
    });
  });
});
