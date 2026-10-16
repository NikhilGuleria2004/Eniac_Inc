import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { ToastProvider } from "../src/components/ui/Toast";
import { DailyLogFormModal } from "../src/features/dailylogs/DailyLogFormModal";
import { TimesheetReviewModal } from "../src/features/timesheets/TimesheetReviewModal";
import { InvoiceComposerPage } from "../src/features/invoices/InvoiceComposerPage";
import type { Timesheet } from "../src/types";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

const mockTs = {
  id: "TS-1",
  employeeName: "John Smith",
  employeeId: "EMP-005",
  periodLabel: "Oct 1-15, 2026",
  totalHours: 80,
  totalBillableHours: 72,
  status: "SUBMITTED",
} as unknown as Timesheet;

describe("DailyLogFormModal", () => {
  it("renders and blocks submit until the form is valid", () => {
    render(<Providers><DailyLogFormModal open onClose={() => {}} /></Providers>);
    expect(screen.getByText("Log Hours")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit log/i })).toBeDisabled();
  });
});

describe("TimesheetReviewModal", () => {
  it("approves with the onApprove callback", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <Providers>
        <TimesheetReviewModal open timesheet={mockTs} mode="approve" reviewerName="Mgr" onClose={() => {}} onApprove={onApprove} onReject={onReject} />
      </Providers>
    );
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText(/Oct 1-15, 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^approve$/i }));
    expect(onApprove).toHaveBeenCalledWith("TS-1", "");
    expect(onReject).not.toHaveBeenCalled();
  });

  it("requires a note to reject", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <Providers>
        <TimesheetReviewModal open timesheet={mockTs} mode="reject" reviewerName="Mgr" onClose={() => {}} onApprove={onApprove} onReject={onReject} />
      </Providers>
    );
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    expect(onReject).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox"), "Needs more detail");
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    expect(onReject).toHaveBeenCalledWith("TS-1", "Needs more detail");
  });
});

describe("InvoiceComposerPage", () => {
  it("renders the single-screen composer for a new invoice", async () => {
    render(<Providers><InvoiceComposerPage /></Providers>);
    expect(screen.getByText("New Invoice")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /line items/i })).toBeInTheDocument();
  });
});
