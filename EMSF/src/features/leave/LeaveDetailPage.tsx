import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { ROUTES } from "../../data/constants";
import { getLeaveRequestById, decideLeaveRequest } from "../../data/mock/repositories";
import { useAuth } from "../auth/AuthContext";
import {
  LEAVE_TYPE_LABELS,
  canApproveLeave,
  canViewLeaveRequest,
  employeeName,
} from "./leave";
import { getEmployees } from "../../data/mock/repositories";

type Flash = { type: "success" | "error"; message: string } | null;

/** Leave request detail: full record, supporting document and approve/reject. */
export function LeaveDetailPage() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const userId = user?.id ?? "";
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const [deciding, setDeciding] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [loading, setLoading] = useState(false);

  const request = useMemo(
    () => (requestId ? getLeaveRequestById(requestId) : undefined),
    [requestId, version],
  );
  const employees = useMemo(() => getEmployees(), []);
  const canApprove = canApproveLeave(role);

  // Route guard for scope (after hooks): EMPLOYEE may only view own requests.
  if (role === "EMPLOYEE" && request && request.employeeId !== userId) {
    return <Navigate to={ROUTES.LEAVE} replace />;
  }
  if (request && !canViewLeaveRequest(role, userId, request)) {
    return <Navigate to={ROUTES.LEAVE} replace />;
  }

  if (!requestId || !request) {
    return (
      <div className="page-container">
        <PageHeader
          title="Leave Request"
          breadcrumbs={[{ label: "Leave", href: ROUTES.LEAVE }, { label: requestId ?? "Unknown" }]}
        />
        <EmptyState
          title="Leave request not found"
          description="This request may have been removed."
          action={
            <Link to={ROUTES.LEAVE} className="btn btn-primary">
              Back to Leave
            </Link>
          }
        />
      </div>
    );
  }

  const closeDecision = () => {
    setDeciding(null);
    setComment("");
    setCommentError("");
  };

  const submitDecision = async () => {
    if (!deciding || loading) return;
    if (deciding === "REJECTED" && comment.trim() === "") {
      setCommentError("A comment is required when rejecting a leave request.");
      return;
    }
    setLoading(true);
    const updated = await decideLeaveRequest(request.id, deciding, comment);
    setLoading(false);
    if (updated) {
      setFlash({
        type: "success",
        message: `Leave request ${updated.status.toLowerCase()}.`,
      });
    } else {
      setFlash({ type: "error", message: "Failed to process leave request." });
    }
    setVersion((v) => v + 1);
    closeDecision();
  };

  const rows: [string, string][] = [
    ["Employee", employeeName(employees, request.employeeId)],
    ["Leave Type", LEAVE_TYPE_LABELS[request.type]],
    ["From", request.startDate],
    ["To", request.endDate],
    ["Days", String(request.days)],
    ["Reason", request.reason],
    ["Submitted", new Date(request.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })],
    ["Status", request.status],
    ["Approved By", request.approvedBy ? employeeName(employees, request.approvedBy) : "—"],
    ["Decision Comment", request.reviewComment ?? "—"],
    ["Supporting Document", request.documentUrl ?? "—"],
  ];

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Leave Request Detail"
        description={`${LEAVE_TYPE_LABELS[request.type]} — ${request.startDate} → ${request.endDate}`}
        breadcrumbs={[{ label: "Leave", href: ROUTES.LEAVE }, { label: request.id }]}
        actions={
          <>
            <StatusBadge status={request.status} />
            {canApprove && request.status === "PENDING" && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    setDeciding("APPROVED");
                    setComment("");
                    setCommentError("");
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeciding("REJECTED");
                    setComment("");
                    setCommentError("");
                  }}
                >
                  Reject
                </Button>
              </>
            )}
          </>
        }
      />

      {flash && (
        <Alert variant={flash.type} className="mb-4">
          {flash.message}
        </Alert>
      )}

      <div className="card">
        <dl className="divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {label === "Status" ? <StatusBadge status={request.status} /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Modal
        open={deciding !== null}
        onClose={closeDecision}
        title={deciding === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
        description={`${request.id} — ${request.days} day(s)`}
        footer={
          <>
            <Button variant="secondary" onClick={closeDecision} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitDecision} loading={loading}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {request.reason} ({request.startDate} → {request.endDate})
          </p>
          <label htmlFor="decision-comment" className="block text-sm font-medium text-gray-700">
            Comment <span className="text-gray-400 font-normal">(required for reject)</span>
          </label>
          <Textarea
            id="decision-comment"
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
    </div>
  );
}
