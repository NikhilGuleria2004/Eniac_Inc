import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import type { Timesheet } from "../../types";

interface TimesheetReviewModalProps {
  open: boolean;
  timesheet: Timesheet | null;
  mode: "approve" | "reject";
  reviewerName: string;
  onClose: () => void;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
}

export function TimesheetReviewModal({ open, timesheet, mode, reviewerName, onClose, onApprove, onReject }: TimesheetReviewModalProps) {
  const { addToast } = useToast();
  const [notes, setNotes] = useState("");

  if (!timesheet) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reject" && notes.trim().length === 0) {
      addToast("warning", "A rejection note is required");
      return;
    }
    if (mode === "approve") {
      onApprove(timesheet.id, notes.trim());
      addToast("success", `Timesheet ${timesheet.id} approved`);
    } else {
      onReject(timesheet.id, notes.trim());
      addToast("success", `Timesheet ${timesheet.id} rejected`);
    }
    setNotes("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => { setNotes(""); onClose(); }}
      title={mode === "approve" ? "Approve Timesheet" : "Reject Timesheet"}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="ts-review-form" className={mode === "approve" ? "btn btn-primary" : "btn btn-danger"}>
            {mode === "approve" ? "Approve" : "Reject"}
          </button>
        </>
      }
    >
      <form id="ts-review-form" onSubmit={handleSubmit} className="space-y-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Timesheet</dt><dd className="text-gray-900">{timesheet.id}</dd>
          <dt className="text-gray-500">Employee</dt><dd className="text-gray-900">{timesheet.employeeName}</dd>
          <dt className="text-gray-500">Period</dt><dd className="text-gray-900">{timesheet.periodLabel}</dd>
          <dt className="text-gray-500">Total Hours</dt><dd className="text-gray-900">{timesheet.totalHours} h</dd>
          <dt className="text-gray-500">Billable</dt><dd className="text-gray-900">{timesheet.totalBillableHours} h</dd>
          <dt className="text-gray-500">Reviewer</dt><dd className="text-gray-900">{reviewerName}</dd>
        </dl>
        <div>
          <label className="form-label">{mode === "reject" ? "Rejection Notes *" : "Approval Notes (optional)"}</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={mode === "reject" ? "Explain why this timesheet is being rejected..." : "Optional notes..."} />
        </div>
      </form>
    </Modal>
  );
}
