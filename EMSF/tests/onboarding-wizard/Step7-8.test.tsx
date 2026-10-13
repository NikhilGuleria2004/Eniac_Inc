import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Step7Activation } from "@/features/onboarding/components/Step7Activation";
import { Step8TimesheetEligibility } from "@/features/onboarding/components/Step8TimesheetEligibility";
import type { Employee } from "@/types";

const mockEmployee: Employee = {
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
};

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: { role: "HR", employeeId: "hr-1" } }),
}));

vi.mock("@/data/mock/repositories", () => ({
  activateOnboarding: vi.fn(),
  getDocumentsByEmployee: vi.fn(() => []),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Step7Activation", () => {
  it("should show 'Activate Employee' button when not activated", () => {
    render(<Step7Activation employee={mockEmployee} onActivated={() => {}} />);
    const btns = screen.getAllByRole("button");
    const activateBtn = btns.find((b) => b.textContent?.includes("Activate Employee"));
    expect(activateBtn).toBeDefined();
  });

  it("should show current status as ONBOARDING", () => {
    render(<Step7Activation employee={mockEmployee} onActivated={() => {}} />);
    expect(screen.getAllByText("ONBOARDING").length).toBeGreaterThan(0);
  });

  it("should show timesheet eligibility as NOT ELIGIBLE", () => {
    render(<Step7Activation employee={mockEmployee} onActivated={() => {}} />);
    expect(screen.getAllByText("NOT ELIGIBLE").length).toBeGreaterThan(0);
  });
});

describe("Step8TimesheetEligibility", () => {
  const activatedBillableEmployee: Employee = {
    ...mockEmployee,
    employmentStatus: "ACTIVE",
    billingStatus: "BILLABLE",
    timesheetEligibility: "ELIGIBLE",
  };

  const activatedNonBillableEmployee: Employee = {
    ...mockEmployee,
    employmentStatus: "ACTIVE",
    billingStatus: "NON_BILLABLE",
    timesheetEligibility: "NOT_ELIGIBLE",
  };

  it("should show ELIGIBLE status for billable employee", () => {
    render(<Step8TimesheetEligibility employee={activatedBillableEmployee} />);
    expect(
      screen.getAllByText("ELIGIBLE — provisioned to timesheet platform").length
    ).toBeGreaterThan(0);
  });

  it("should show NOT ELIGIBLE for non-billable employee", () => {
    render(<Step8TimesheetEligibility employee={activatedNonBillableEmployee} />);
    expect(
      screen.getAllByText("NOT ELIGIBLE — non-billable employee").length
    ).toBeGreaterThan(0);
  });

  it("should show 'View Timesheet Details' link", () => {
    render(<Step8TimesheetEligibility employee={activatedBillableEmployee} />);
    const links = screen.getAllByRole("link");
    const timesheetLink = links.find((l) => l.textContent?.includes("View Timesheet Details"));
    expect(timesheetLink).toBeDefined();
  });

  it("should show 'Done' button", () => {
    render(<Step8TimesheetEligibility employee={activatedBillableEmployee} />);
    const btns = screen.getAllByRole("button");
    const doneBtn = btns.find((b) => b.textContent?.includes("Done"));
    expect(doneBtn).toBeDefined();
  });
});
