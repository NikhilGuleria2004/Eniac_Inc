import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Step5Documents } from "@/features/onboarding/components/Step5Documents";
import { mockDocuments, mockEmployees } from "@/data/mock/index";
import {
  getDocumentsByEmployee,
  uploadEmployeeDocument,
  reviewDocument,
  deleteDocument,
} from "@/data/mock/repositories";
import type { Employee, Document } from "@/types";

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
  getDocumentsByEmployee: vi.fn(),
  uploadEmployeeDocument: vi.fn(),
  reviewDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: any) =>
    open ? <div className="modal-open">{children}</div> : null,
}));

vi.mock("@/components/ui/Tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

const baseDocs: Document[] = [
  {
    id: "doc-1",
    employeeId: "emp-1",
    name: "Offer Letter.pdf",
    type: "OFFER_LETTER",
    uploadedAt: "2026-10-01T00:00:00Z",
    status: "PENDING",
  },
  {
    id: "doc-2",
    employeeId: "emp-1",
    name: "RESUME.pdf",
    type: "RESUME",
    uploadedAt: "2026-10-01T00:00:00Z",
    status: "PENDING",
  },
];

describe("P8.5 — Document upload + HR approve/reject", () => {
  beforeEach(() => {
    mockDocuments.length = 0;
    mockEmployees.length = 0;
    mockEmployees.push(mockEmployee);

    vi.mocked(getDocumentsByEmployee).mockReturnValue([...baseDocs]);
    vi.mocked(uploadEmployeeDocument).mockResolvedValue({
      id: "doc-3",
      employeeId: "emp-1",
      name: "New Doc.pdf",
      type: "OFFER_LETTER",
      uploadedAt: "2026-10-01T00:00:00Z",
      status: "PENDING",
    });
    vi.mocked(reviewDocument).mockImplementation((id: string, decision: string) => ({
      id,
      employeeId: "emp-1",
      name: "Doc.pdf",
      type: "RESUME",
      uploadedAt: "2026-10-01T00:00:00Z",
      status: decision as Document["status"],
    }));
    vi.mocked(deleteDocument).mockReturnValue(true);
  });

  it("should display existing documents in the table", () => {
    render(<Step5Documents employee={mockEmployee} />);

    expect(screen.getAllByText("Offer Letter.pdf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RESUME.pdf").length).toBeGreaterThan(0);
  });

  it("should show required document types as rows even if not uploaded", () => {
    render(<Step5Documents employee={mockEmployee} />);

    expect(screen.getAllByText("OFFER LETTER").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EMPLOYMENT AGREEMENT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ID PROOF").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADDRESS PROOF").length).toBeGreaterThan(0);
  });

  it("should show Approve button for non-required PENDING documents when HR role", () => {
    render(<Step5Documents employee={mockEmployee} />);

    const approveIcons = screen.getAllByTitle("Approve");
    expect(approveIcons.length).toBeGreaterThan(0);
  });

  it("should show Reject button for non-required PENDING documents when HR role", () => {
    render(<Step5Documents employee={mockEmployee} />);

    const rejectIcons = screen.getAllByTitle("Reject");
    expect(rejectIcons.length).toBeGreaterThan(0);
  });

  it("should open upload modal when 'Upload Document' clicked", async () => {
    render(<Step5Documents employee={mockEmployee} />);

    const uploadBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Upload Document"));
    fireEvent.click(uploadBtn!);

    await waitFor(() => {
      expect(screen.getAllByText("Upload Document").length).toBeGreaterThan(0);
    });
  });

  it("should call reviewDocument with APPROVED when HR approves a doc", () => {
    render(<Step5Documents employee={mockEmployee} />);

    const approveButtons = screen.getAllByTitle("Approve");
    fireEvent.click(approveButtons[0]);

    expect(reviewDocument).toHaveBeenCalledWith("doc-2", "APPROVED");
  });

  it("should show document count in header", () => {
    render(<Step5Documents employee={mockEmployee} />);

    expect(
      screen.getAllByText("Documents (2 uploaded)").length
    ).toBeGreaterThan(0);
  });

  it("should show 'Missing' for missing required docs", () => {
    render(<Step5Documents employee={mockEmployee} />);

    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
  });
});
