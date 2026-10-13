import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../../../components/tables/DataTable";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Textarea } from "../../../components/ui/Textarea";
import { Select } from "../../../components/ui/Select";
import { ROUTES } from "../../../data/constants";
import { getEmployees } from "../../../data/mock/repositories";
import { LEAVE_TYPE_LABELS, type LeaveStatus } from "../leave";
import type { LeaveRequest } from "../../../types";

interface RequestsTabProps {
  requests: LeaveRequest[];
  canApprove: boolean;
  onDecide: (
    request: LeaveRequest,
    decision: "APPROVED" | "REJECTED",
    comment: string,
  ) => Promise<void> | void;
}

/** §47 leave requests table: Employee / Type / From / To / Days / Reason / Submitted / Status / Action. */
export function RequestsTab({ requests, canApprove, onDecide }: RequestsTabProps) {
  const navigate = useNavigate();
  const employeeMap = new Map(
    getEmployees().map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | LeaveStatus>("ALL");
  const [deciding, setDeciding] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter],
  );

  const closeDecision = () => {
    setDeciding(null);
    setComment("");
    setCommentError("");
  };

  const submit = async (decision: "APPROVED" | "REJECTED") => {
    if (!deciding || loading) return;
    if (decision === "REJECTED" && comment.trim() === "") {
      setCommentError("A comment is required when rejecting a leave request.");
      return;
    }
    setLoading(true);
    await onDecide(deciding, decision, comment);
    setLoading(false);
    closeDecision();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <label htmlFor="leave-status-filter" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <Select
          id="leave-status-filter"
          className="w-full sm:w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | LeaveStatus)}
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <span className="text-sm text-gray-500">{filtered.length} requests</span>
      </div>

      <DataTable
        data={filtered}
        keyExtractor={(r) => r.id}
        columns={[
          {
            key: "employee",
            header: "Employee",
            sortable: true,
            cell: (r) => (
              <span className="font-medium text-gray-900">
                {employeeMap.get(r.employeeId) ?? r.employeeId}
              </span>
            ),
          },
          {
            key: "type",
            header: "Leave Type",
            sortable: true,
            cell: (r) => LEAVE_TYPE_LABELS[r.type],
          },
          { key: "from", header: "From", sortable: true, cell: (r) => r.startDate },
          { key: "to", header: "To", sortable: true, cell: (r) => r.endDate },
          { key: "days", header: "Days", sortable: true, cell: (r) => r.days },
          {
            key: "reason",
            header: "Reason",
            cell: (r) => <span className="line-clamp-1">{r.reason}</span>,
          },
          {
            key: "submitted",
            header: "Submitted",
            sortable: true,
            cell: (r) => r.createdAt.slice(0, 10),
          },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: "action",
            header: "Action",
            cell: (r) => (
              <div className="flex flex-wrap items-center gap-2">
                {canApprove && r.status === "PENDING" && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setDeciding(r);
                        setComment("");
                        setCommentError("");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDeciding(r);
                        setComment("");
                        setCommentError("");
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(ROUTES.LEAVE_DETAIL(r.id))}
                >
                  View
                </Button>
              </div>
            ),
          },
        ]}
        emptyState={{
          title: "No leave requests",
          description: "No requests match the selected status filter.",
        }}
      />

      <Modal
        open={deciding !== null}
        onClose={closeDecision}
        title="Review Leave Request"
        description={
          deciding
            ? `${employeeMap.get(deciding.employeeId) ?? deciding.employeeId} — ${LEAVE_TYPE_LABELS[deciding.type]} (${deciding.startDate} → ${deciding.endDate})`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDecision} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => submit("REJECTED")} loading={loading}>
              Reject
            </Button>
            <Button variant="primary" onClick={() => submit("APPROVED")} loading={loading}>
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deciding && (
            <div className="text-sm text-gray-600">
              <p>
                Days: <strong>{deciding.days}</strong> · Reason:{" "}
                <strong>{deciding.reason}</strong>
              </p>
              {deciding.documentUrl && (
                <p className="mt-1">
                  Supporting document: <strong>{deciding.documentUrl}</strong>
                </p>
              )}
            </div>
          )}
          <label htmlFor="leave-review-comment" className="block text-sm font-medium text-gray-700">
            Comment <span className="text-gray-400 font-normal">(required for reject)</span>
          </label>
          <Textarea
            id="leave-review-comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setCommentError("");
            }}
            placeholder="Add a note with your decision…"
          />
          {commentError && <p className="text-sm text-red-600">{commentError}</p>}
        </div>
      </Modal>
    </>
  );
}

