import { useUnsavedChangesWarning } from "../../lib/useUnsavedChangesWarning";
import { useFocusError } from "../../lib/useFocusError";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { ROUTES, LEAVE_TYPES } from "../../data/constants";
import { getLeaveRequests, createLeaveRequest } from "../../data/mock/repositories";
import { useAuth } from "../auth/AuthContext";
import {
  LEAVE_TYPE_LABELS,
  getRequestSummary,
  requiresSupportingDocument,
  validateLeaveRequest,
  requestDays,
} from "./leave";
import type { LeaveType } from "./leave";

/** §48 Leave Request Form with live summary and validation. */
export function LeaveRequestPage() {
  const { user } = useAuth();
  const employeeId = user?.id ?? "";
  const navigate = useNavigate();

  const [type, setType] = useState<LeaveType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [documentName, setDocumentName] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<string[]>([]);
  const errorSummaryRef = useFocusError<HTMLUListElement>(errors.length);

  useUnsavedChangesWarning(
    type !== "" || startDate !== "" || endDate !== "" || reason !== "" || !!documentName
  );

  const existing = useMemo(() => getLeaveRequests(), []);
  const input = { employeeId, type, startDate, endDate, reason, documentName };
  const summary = useMemo(() => getRequestSummary(input, existing), [
    employeeId, type, startDate, endDate, reason, documentName, existing,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateLeaveRequest(input, existing);
    setErrors(found);
    if (found.length > 0) return;
    try {
      const created = await createLeaveRequest({
        employeeId,
        type: type as LeaveType,
        startDate,
        endDate,
        days: requestDays(startDate, endDate),
        reason: reason.trim(),
        documentUrl: documentName,
        status: "PENDING",
      });
      if (!created) {
        setErrors(["Could not submit leave request."]);
        return;
      }
      navigate(ROUTES.LEAVE, { state: { flash: `Leave request ${created.id} submitted for approval.` } });
    } catch {
      setErrors(["Could not submit leave request."]);
    }
  };

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="Request Leave"
        description="Submit a new leave request for approval"
        breadcrumbs={[{ label: "Leave", href: ROUTES.LEAVE }, { label: "Request Leave" }]}
      />

      {errors.length > 0 && (
        <Alert variant="error" className="mb-4">
          <ul className="list-disc pl-4 space-y-1" tabIndex={-1} ref={errorSummaryRef}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="leave-type" className="form-label">Leave Type</label>
            <Select id="leave-type" value={type} onChange={(e) => setType(e.target.value as LeaveType | "")}>
              <option value="">Select leave type</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </div>
          <div />
          <div>
            <label htmlFor="start-date" className="form-label">Start Date</label>
            <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="end-date" className="form-label">End Date</label>
            <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="leave-reason" className="form-label">Reason</label>
          <Textarea id="leave-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you taking leave?" />
        </div>
        <div>
          <label htmlFor="leave-document" className="form-label">
            Supporting Document
            {type && requiresSupportingDocument(type) && (
              <span className="text-red-600 ml-1">*</span>
            )}
          </label>
          <input
            id="leave-document"
            type="file"
            className="form-input"
            onChange={(e) => setDocumentName(e.target.files?.[0]?.name)}
          />
          {type && requiresSupportingDocument(type) && (
            <p className="form-hint">A document is required for {LEAVE_TYPE_LABELS[type]}.</p>
          )}
        </div>

        {/* §48 summary */}
        <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Requested Days</p>
            <p className="text-lg font-semibold text-gray-900">{summary.requested}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Available Balance</p>
            <p className="text-lg font-semibold text-gray-900">{summary.available}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">Remaining Balance</p>
            <p className="text-lg font-semibold text-gray-900">{summary.remaining}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <Link to={ROUTES.LEAVE} className="btn btn-secondary">
            Cancel
          </Link>
          <Button variant="primary" type="submit">
            <CalendarPlus aria-hidden="true" size={16} className="mr-1.5" />
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
