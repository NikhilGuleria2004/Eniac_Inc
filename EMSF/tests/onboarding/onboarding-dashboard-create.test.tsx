import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Employee } from "@/types";
import { mockEmployees } from "@/data/mock/index";
import { createEmployee } from "@/data/mock/repositories";
import { OnboardingDashboardPage } from "@/features/onboarding/OnboardingDashboardPage";

const { apiSpy } = vi.hoisted(() => ({ apiSpy: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiFetch: apiSpy,
  setTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  getApiBaseUrl: vi.fn(),
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: { role: "HR", employeeId: "hr-1" } }),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: () => true,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const NEW_EMPLOYEE: Employee = {
  id: "EMP-2001",
  employeeCode: "EMP-2001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  workMail: "jane.doe@company.com",
  phone: "+1 555-1234",
  avatar: undefined,
  designation: "Engineer",
  department: "Engineering",
  country: "United States",
  state: "CA",
  city: "SF",
  employmentStatus: "ONBOARDING",
  employmentType: "FULL_TIME",
  billingStatus: "BILLABLE",
  joiningDate: "2026-10-15",
  managerId: undefined,
  supervisorId: undefined,
  timesheetEligibility: "NOT_ELIGIBLE",
  role: "HR",
  createdAt: "2026-10-15T00:00:00Z",
  updatedAt: "2026-10-15T00:00:00Z",
} as Employee;

beforeEach(() => {
  mockEmployees.length = 0;
  apiSpy.mockReset();
});

afterEach(() => {
  cleanup();
  mockEmployees.length = 0;
});

describe("Onboarding dashboard — reactive to createEmployee", () => {
  it("shows a newly created employee without a reload", async () => {
    apiSpy.mockResolvedValue({ success: true, data: {} });

    render(
      <MemoryRouter>
        <OnboardingDashboardPage />
      </MemoryRouter>
    );

    // The list starts empty (no reload/re-fetch of the backend).
    expect(screen.getByText("No onboarding records")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();

    // HR sends the invite: createEmployee POSTs + commits to the local store.
    await createEmployee(NEW_EMPLOYEE);

    // The dashboard updates reactively (no remount, no reload).
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
  });

  it("does not surface a rejected create in the list (no optimistic local mutation)", async () => {
    apiSpy.mockRejectedValue(new Error("network down"));

    render(
      <MemoryRouter>
        <OnboardingDashboardPage />
      </MemoryRouter>
    );

    await expect(createEmployee(NEW_EMPLOYEE)).rejects.toThrow();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("No onboarding records")).toBeInTheDocument();
  });
});
