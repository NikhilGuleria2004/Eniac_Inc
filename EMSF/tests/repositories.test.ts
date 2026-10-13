import { describe, expect, it, vi, beforeEach } from "vitest";

const { apiSpy } = vi.hoisted(() => ({
  apiSpy: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiSpy,
  ApiRequestError: class extends Error {
    constructor(public code: string, message: string, public fields?: Record<string, string[]>) {
      super(message);
      this.name = "ApiRequestError";
    }
  },
  setTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  getApiBaseUrl: vi.fn(),
}));

import { mockEmployees } from "@/data/mock/index";
import { createEmployee, createOnboardingRecord, getEmployeeById } from "@/data/mock/repositories";
import { ApiRequestError } from "@/lib/api";

const BASE_DATA = {
  employeeCode: "EMP-2001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  workMail: "jane.doe@company.com",
  phone: "+1 555-1234",
  designation: "Engineer",
  department: "Engineering",
  country: "United States",
  state: "CA",
  city: "SF",
  employmentStatus: "ONBOARDING" as const,
  employmentType: "FULL_TIME" as const,
  billingStatus: "BILLABLE" as const,
  joiningDate: "2026-10-15",
  managerId: "mgr-1",
  timesheetEligibility: "NOT_ELIGIBLE" as const,
  role: "HR" as const,
} as const;

describe("createEmployee persistence", () => {
  beforeEach(() => {
    mockEmployees.length = 0;
    apiSpy.mockReset();
  });

  it("persists to backend API on success and returns the employee", async () => {
    apiSpy.mockResolvedValue({ success: true, data: {} });

    const result = await createEmployee(BASE_DATA);

    expect(result).toBeDefined();
    expect(result.employeeCode).toBe("EMP-2001");

    const fromMock = getEmployeeById("EMP-2001");
    expect(fromMock).toBeDefined();
    expect(fromMock?.email).toBe("jane@example.com");

    expect(apiSpy).toHaveBeenCalledWith(
      "/employees",
      expect.objectContaining({ method: "POST" })
    );
    const callBody = JSON.parse(apiSpy.mock.calls[0][1].body);
    expect(callBody.employeeId).toBe("EMP-2001");
    expect(callBody.workMail).toBe("jane.doe@company.com");
  });

  it("throws an error when the backend API fails instead of silently succeeding", async () => {
    apiSpy.mockRejectedValue(
      new ApiRequestError("VALIDATION_ERROR", "email already exists")
    );

    await expect(createEmployee(BASE_DATA)).rejects.toThrow();
  });

  it("createOnboardingRecord sends POST to /onboarding with employeeId", async () => {
    apiSpy.mockResolvedValue({ success: true, data: {} });

    await createOnboardingRecord("EMP-2001");

    expect(apiSpy).toHaveBeenCalledWith(
      "/onboarding",
      expect.objectContaining({ method: "POST" })
    );
    const callBody = JSON.parse(apiSpy.mock.calls[0][1].body);
    expect(callBody.employeeId).toBe("EMP-2001");
  });
});
