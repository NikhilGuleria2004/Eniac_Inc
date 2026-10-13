import { useState } from "react";
import { DataTable } from "../../../components/tables/DataTable";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Textarea } from "../../../components/ui/Textarea";
import { CorrectionBadge } from "../CorrectionBadge";
import { formatHours, type AttendanceException } from "../attendance";
import { getEmployees } from "../../../data/mock/repositories";
import type { Attendance } from "../../../types";

interface ExceptionsTabProps {
  exceptions: AttendanceException[];
  canReview: boolean;
  onReview: (record: Attendance, decision: "APPROVED" | "REJECTED", comment: string) => void;
}

/** §46 Attendance Exceptions tab + §15 correction review (attendance.manage). */
export function ExceptionsTab({ exceptions, canReview, onReview }: ExceptionsTabProps) {
  const employeeMap = new Map(getEmployees().map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  const [reviewing, setReviewing] = useState<Attendance | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const closeReview = () => {
    setReviewing(null);
    setComment("");
    setCommentError("");
  };

  const submit = (decision: "APPROVED" | "REJECTED") => {
    if (!reviewing) return;
    if (decision === "REJECTED" && comment.trim() === "") {
      setCommentError("A comment is required when rejecting a correction.");
      return;
    }
    onReview(reviewing, decision, comment);
    closeReview();
  };

  return (
    <>
      <DataTable
        data={exceptions}
        keyExtractor={(e) => e.record.id}
        columns={[
          {
            key: "employee",
            header: "Employee",
            sortable: true,
            cell: (e) => (
              <span className="font-medium text-gray-900">
                {employeeMap.get(e.record.employeeId) ?? e.record.employeeId}
              </span>
            ),
          },
          { key: "date", header: "Date", sortable: true, cell: (e) => e.record.date },
          { key: "issue", header: "Issue", sortable: true, cell: (e) => e.issue },
          { key: "checkIn", header: "Check In", cell: (e) => e.record.checkIn ?? "—" },
          { key: "checkOut", header: "Check Out", cell: (e) => e.record.checkOut ?? "—" },
          { key: "hours", header: "Working Hours", cell: (e) => formatHours(e.record.workingHours) },
          { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.record.status} /> },
          {
            key: "action",
            header: "Action",
            cell: (e) => {
              if (e.record.correctionRequested) {
                return canReview ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setReviewing(e.record);
                      setComment("");
                      setCommentError("");
                    }}
                  >
                    Review Correction
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">Awaiting HR review</span>
                );
              }
              return <CorrectionBadge record={e.record} />;
            },
          },
        ]}
        emptyState={{
          title: "No attendance exceptions",
          description: "All punches look complete for the selected period.",
        }}
      />

      <Modal
        open={reviewing !== null}
        onClose={closeReview}
        title="Review Correction Request"
        description={
          reviewing
            ? `${employeeMap.get(reviewing.employeeId) ?? reviewing.employeeId} — ${reviewing.date}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeReview}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => submit("REJECTED")}>
              Reject
            </Button>
            <Button variant="primary" onClick={() => submit("APPROVED")}>
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {reviewing && (
            <div className="text-sm text-gray-600">
              <p>
                Check In: <strong>{reviewing.checkIn ?? "—"}</strong> · Check Out:{" "}
                <strong>{reviewing.checkOut ?? "—"}</strong>
              </p>
            </div>
          )}
          <label htmlFor="correction-comment" className="block text-sm font-medium text-gray-700">
            Comment {<span className="text-gray-400 font-normal">(required for reject)</span>}
          </label>
          <Textarea
            id="correction-comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setCommentError("");
            }}
            placeholder="Optional for approve, required for reject"
            rows={3}
          />
          {commentError && <p className="text-xs text-red-600">{commentError}</p>}
        </div>
      </Modal>
    </>
  );
}
