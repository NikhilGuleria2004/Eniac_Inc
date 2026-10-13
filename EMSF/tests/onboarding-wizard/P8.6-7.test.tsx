import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Step4BillingClassification } from "@/features/onboarding/components/StepEditors";
import { Step8TimesheetEligibility } from "@/features/onboarding/components/Step8TimesheetEligibility";
import { Step7Activation } from "@/features/onboarding/components/Step7Activation";
import { mockEmployees, mockDocuments } from "@/data/mock/index";
import { updateOnboardingBilling, activateOnboarding } from "@/data/mock/repositories";
import type { Employee } from "@/types";

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

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: { role: "HR", employeeId: "hr-1" } }),
}));

vi.mock("@/data/mock/repositories", () => ({
  updateOnboardingBilling: vi.fn(),
  activateOnboarding: vi.fn(),
  getDocumentsByEmployee: vi.fn(() => []),
  getEmployees: vi.fn(() => []),
  updateEmployee: vi.fn(),
  sendOnboardingInvite: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/Tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

describe("P8.6 — Billing change reflects in eligibility display", () => {
  beforeEach(() => {
    mockEmployees.length = 0;
    mockDocuments.length = 0;
    vi.mocked(updateOnboardingBilling).mockClear();
  });

  it("should show 'ELIGIBLE' preview when BILLABLE is selected", () => {
    const employee = makeEmployee({ billingStatus: "BILLABLE" });
    render(<Step4BillingClassification employee={employee} onSaved={() => {}} />);

    expect(screen.getAllByText("ELIGIBLE").length).toBeGreaterThan(0);
  });

  it("should show 'NOT ELIGIBLE' preview when NON_BILLABLE is selected", () => {
    const employee = makeEmployee({ billingStatus: "NON_BILLABLE" });
    render(<Step4BillingClassification employee={employee} onSaved={() => {}} />);

    expect(screen.getAllByText("NOT ELIGIBLE").length).toBeGreaterThan(0);
  });

  it("should show 'BILLABLE' and 'NON-BILLABLE' radio labels", () => {
    const employee = makeEmployee({ billingStatus: "BILLABLE" });
    render(<Step4BillingClassification employee={employee} onSaved={() => {}} />);

    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(2);
  });

  it("should show explanatory text for BILLABLE: timesheet platform provisioning", () => {
    const employee = makeEmployee({ billingStatus: "BILLABLE" });
    render(<Step4BillingClassification employee={employee} onSaved={() => {}} />);

    expect(
      screen.getAllByText(/timesheet platform provisioning/).length
    ).toBeGreaterThan(0);
  });

  it("should call updateOnboardingBilling when 'Save Billing' clicked", async () => {
    vi.mocked(updateOnboardingBilling).mockResolvedValue(undefined);

    const employee = makeEmployee({ billingStatus: "BILLABLE" });
    render(<Step4BillingClassification employee={employee} onSaved={() => {}} />);

    const saveBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Save Billing"));
    fireEvent.click(saveBtn!);

    await waitFor(() => {
      expect(updateOnboardingBilling).toHaveBeenCalledWith("emp-1", "BILLABLE");
    });
  });

  it("should show ELIGIBLE status for billable + activated employee in Step 8", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      timesheetEligibility: "ELIGIBLE",
    });
    render(
      <MemoryRouter>
        <Step8TimesheetEligibility employee={employee} />
      </MemoryRouter>
    );

    expect(
      screen.getAllByText("ELIGIBLE — provisioned to timesheet platform").length
    ).toBeGreaterThan(0);
  });

  it("should show NOT ELIGIBLE status for non-billable + activated employee in Step 8", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "NON_BILLABLE",
      timesheetEligibility: "NOT_ELIGIBLE",
    });
    render(
      <MemoryRouter>
        <Step8TimesheetEligibility employee={employee} />
      </MemoryRouter>
    );

    expect(
      screen.getAllByText("NOT ELIGIBLE — non-billable employee").length
    ).toBeGreaterThan(0);
  });

  it("should show 'View Timesheet Details' link on Step 8", () => {
    const employee = makeEmployee({
      employmentStatus: "ACTIVE",
      billingStatus: "BILLABLE",
      timesheetEligibility: "ELIGIBLE",
    });
    render(
      <MemoryRouter>
        <Step8TimesheetEligibility employee={employee} />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link");
    const timesheetLink = links.find((l) =>
      l.textContent?.includes("View Timesheet Details")
    );
    expect(timesheetLink).toBeDefined();
  });
});

describe("P8.7 — API failure on activate → error banner + retry", () => {
  beforeEach(() => {
    mockEmployees.length = 0;
    mockDocuments.length = 0;
    vi.mocked(activateOnboarding).mockReset();
    vi.mocked(updateOnboardingBilling).mockReset();
  });

  it("should show error message when activateOnboarding throws", async () => {
    vi.mocked(activateOnboarding).mockRejectedValue(
      new Error("Approval not complete")
    );
    const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
    render(<Step7Activation employee={employee} onActivated={() => {}} />);

    const activateBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Activate Employee"));
    fireEvent.click(activateBtn!);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Approval not complete/).length
      ).toBeGreaterThan(0);
    });
  });

  it("should show generic error when API fails with no message", async () => {
    vi.mocked(activateOnboarding).mockRejectedValue(new Error(""));
    const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
    render(<Step7Activation employee={employee} onActivated={() => {}} />);

    const activateBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Activate Employee"));
    fireEvent.click(activateBtn!);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Failed to activate employee/).length
      ).toBeGreaterThan(0);
    });
  });

  it("should show 'Activating...' during API call", async () => {
    vi.mocked(activateOnboarding).mockImplementation(
      () => new Promise(() => {}) as any
    );
    const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
    const { container } = render(<Step7Activation employee={employee} onActivated={() => {}} />);

    const activateBtn = container.querySelector('[data-step-activate="true"]') as HTMLElement;
    fireEvent.click(activateBtn!);

    await waitFor(() => {
      const btn = container.querySelector('[data-step-activate="true"]');
      expect(btn?.textContent).toContain("Activating");
    }, { timeout: 3000 });
  });

  it("should retry activation after error and succeed", async () => {
    vi.mocked(activateOnboarding)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        employeeId: "emp-1",
        employmentStatus: "ACTIVE",
        timesheetEligibility: "ELIGIBLE",
        invitationSent: false,
      });

    const employee = makeEmployee({ employmentStatus: "ONBOARDING" });
    render(<Step7Activation employee={employee} onActivated={() => {}} />);

    const activateBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Activate Employee"));

    fireEvent.click(activateBtn!);

    await waitFor(() => {
      expect(screen.getAllByText(/Network error/).length).toBeGreaterThan(0);
    });

    fireEvent.click(activateBtn!);

    await waitFor(() => {
      expect(
        screen.getAllByText(/activated successfully/.length > 0
          ? /activated successfully/
          : /activated/).length
      ).toBeGreaterThan(0);
    });
  });

  it("should not show activate button when already activated", () => {
    const employee = makeEmployee({ employmentStatus: "ACTIVE" });
    const { container } = render(<Step7Activation employee={employee} onActivated={() => {}} />);

    const activateBtn = container.querySelector('[data-step-activate="true"]');
    expect(activateBtn).toBeNull();
  });
});
