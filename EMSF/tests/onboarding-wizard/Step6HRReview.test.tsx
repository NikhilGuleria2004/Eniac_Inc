import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Step6HRReview } from "@/features/onboarding/components/Step6HRReview";
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
  approveOnboarding: vi.fn(),
  rejectOnboarding: vi.fn(),
  getDocumentsByEmployee: vi.fn(() => []),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Step6HRReview", () => {
  it("should show 'Approve Onboarding' button", () => {
    render(
      <Step6HRReview employee={mockEmployee} onApproved={() => {}} onRejected={() => {}} />
    );
    const btns = screen.getAllByRole("button");
    const approveBtn = btns.find((b) => b.textContent?.includes("Approve Onboarding"));
    expect(approveBtn).toBeDefined();
  });

  it("should show Reject button", () => {
    render(
      <Step6HRReview employee={mockEmployee} onApproved={() => {}} onRejected={() => {}} />
    );
    const btns = screen.getAllByRole("button");
    const rejectBtn = btns.find((b) => b.textContent?.includes("Reject"));
    expect(rejectBtn).toBeDefined();
  });

  it("should show employee status details", () => {
    render(
      <Step6HRReview employee={mockEmployee} onApproved={() => {}} onRejected={() => {}} />
    );
    expect(screen.getAllByText("ONBOARDING").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BILLABLE").length).toBeGreaterThan(0);
  });
});
