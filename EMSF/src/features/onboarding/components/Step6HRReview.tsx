import { useState } from "react";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import type { Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import { approveOnboarding, rejectOnboarding, getDocumentsByEmployee } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";
import { allRequiredDocumentsApproved } from "../documents";

export interface ApprovalResult {
  employeeId: string;
  employmentStatus: string;
  billingStatus: string;
  timesheetEligibility: string;
}

export type ApprovalOutcome =
  | { status: "idle" }
  | { status: "approving" }
  | { status: "approved"; result: ApprovalResult }
  | { status: "rejecting" }
  | { status: "rejected"; reason: string }
  | { status: "error"; message: string };

interface Step6HRReviewProps {
  employee: Employee;
  onApproved: () => void;
  onRejected: () => void;
}

export function Step6HRReview({ employee, onApproved, onRejected }: Step6HRReviewProps) {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canApprove = hasPermission(role, "onboarding.manage");
  const { addToast } = useToast();

  const [outcome, setOutcome] = useState<ApprovalOutcome>({ status: "idle" });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const documents = getDocumentsByEmployee(employee.id);
  const allDocsApproved = allRequiredDocumentsApproved(documents);

  const handleApprove = async () => {
    if (!allDocsApproved) {
      setOutcome({
        status: "error",
        message: "Cannot approve: all required documents must be APPROVED first.",
      });
      return;
    }
    setOutcome({ status: "approving" });
    try {
      const result = await approveOnboarding(employee.id);
      setOutcome({
        status: "approved",
        result: {
          employeeId: result.employeeId,
          employmentStatus: result.employmentStatus,
          billingStatus: result.billingStatus,
          timesheetEligibility: result.timesheetEligibility,
        },
      });
       onApproved();
       addToast("success", `Onboarding approved for ${employee.firstName} ${employee.lastName}.`);
     } catch (e) {
       const msg = e instanceof Error ? e.message : "Failed to approve onboarding.";
       setOutcome({ status: "error", message: msg });
       addToast("error", "Approval failed: " + msg);
     }
   };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }
    setRejectSubmitting(true);
    setOutcome({ status: "rejecting" });
    try {
      await rejectOnboarding(employee.id, rejectReason.trim());
      setOutcome({ status: "rejected", reason: rejectReason.trim() });
      setRejectOpen(false);
      setRejectReason("");
      onRejected();
      addToast("success", `Onboarding rejected for ${employee.firstName} ${employee.lastName}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reject onboarding.";
      setOutcome({ status: "error", message: msg });
      setRejectSubmitting(false);
    }
  };

  const handleBulkApproveDocs = async () => {
    const pendingDocs = documents.filter(
      (d) => d.status === "PENDING" || d.status === "UNDER_REVIEW"
    );
    if (pendingDocs.length === 0) return;
    if (!confirm(`Approve ${pendingDocs.length} pending document(s)?`)) return;
    for (const doc of pendingDocs) {
      await import("../../../data/mock/repositories").then((mod) => {
        mod.reviewDocument(doc.id, "APPROVED");
      });
    }
    onApproved();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Employment Status:</span>
          <span className="text-gray-900">{employee.employmentStatus}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Billing Status:</span>
          <span className="text-gray-900">{employee.billingStatus}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Documents Status:</span>
          <span className="text-gray-900">
            {documents.filter((d) => d.status === "APPROVED").length}/{documents.length} approved
          </span>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-1 px-2 font-medium text-gray-600">Document</th>
                <th className="text-left py-1 px-2 font-medium text-gray-600">Type</th>
                <th className="text-left py-1 px-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-1 px-2">{d.name}</td>
                  <td className="py-1 px-2 text-gray-600">{d.type.replace(/_/g, " ")}</td>
                  <td className="py-1 px-2"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!allDocsApproved && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          <FileText size={14} className="inline mr-1" />
          All required documents (OFFER_LETTER, EMPLOYMENT_AGREEMENT, ID_PROOF, ADDRESS_PROOF) must be APPROVED before approval.
          {documents.some((d) => d.status !== "APPROVED") && (
            <button
              type="button"
              onClick={handleBulkApproveDocs}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Bulk approve pending docs
            </button>
          )}
        </div>
      )}

      {outcome.status === "approved" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
          <CheckCircle size={16} className="inline mr-1" />
          <span className="font-medium">Onboarding approved!</span>
          <div className="mt-1 text-xs">
            Employment Status: <strong>{outcome.result.employmentStatus}</strong> ·{" "}
            Timesheet: <strong>{outcome.result.timesheetEligibility}</strong>
          </div>
        </div>
      )}

      {outcome.status === "rejected" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <XCircle size={16} className="inline mr-1" />
          <span className="font-medium">Onboarding rejected</span> — reason: {outcome.reason}
        </div>
      )}

      {outcome.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {outcome.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={!canApprove || outcome.status === "approving" || outcome.status === "approved"}
          size="sm"
          data-step-primary="true"
        >
          {outcome.status === "approving" ? "Approving..." : "Approve Onboarding"}
        </Button>
        <Button
          variant="danger"
          onClick={() => setRejectOpen(true)}
          disabled={!canApprove || outcome.status === "rejected" || outcome.status === "approved"}
          size="sm"
        >
          Reject
        </Button>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Onboarding"
        description="Provide a reason for rejecting this employee's onboarding."
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={() => setRejectOpen(false)}
              disabled={rejectSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger text-sm"
              onClick={handleReject}
              disabled={rejectSubmitting || !rejectReason.trim()}
            >
              {rejectSubmitting ? "Rejecting..." : "Reject"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <textarea
            className="form-input"
            rows={3}
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={rejectSubmitting}
          />
        </div>
      </Modal>
    </div>
  );
}
