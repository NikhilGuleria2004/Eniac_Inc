import { useMemo, useState } from "react";
import { NavLink, useParams, Navigate } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { getDocumentById, getEmployeeById, reviewDocument } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/data/StatusBadge";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { Textarea } from "../../components/ui/Textarea";
import { commentRequired, formatExpiry, getExpiryState, scopeDocumentsForRole } from "./documents";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const bump = () => setVersion((v) => v + 1);

  const role = user?.role ?? "EMPLOYEE";
  // `version` re-reads the document after a review decision mutates mock state.
  const doc = useMemo(
    () => (documentId ? getDocumentById(documentId) : undefined),
    [documentId, version]
  );
  const canView = hasPermission(role, "document.view");
  const canReview = hasPermission(role, "document.review");
  const scoped = doc ? scopeDocumentsForRole([doc], role, user?.id) : [];
  const visible = canView && scoped.length > 0;

  if (!canView) return <Navigate to="/403" replace />;
  if (!doc || !visible) {
    return (
      <div className="page-container">
        <div className="card">
          <h1 className="text-lg font-semibold text-gray-900">Document not found</h1>
          <NavLink to={ROUTES.DOCUMENTS} className="btn btn-secondary text-sm mt-4">Back to Documents</NavLink>
        </div>
      </div>
    );
  }

  const employee = getEmployeeById(doc.employeeId);
  const reviewer = doc.reviewedBy ? getEmployeeById(doc.reviewedBy) : undefined;
  const expiryState = getExpiryState(doc);

   const decide = (decision: "APPROVED" | "REJECTED" | "CHANGES") => {
     setError("");
     setFlash("");
     if (commentRequired(decision) && comment.trim() === "") {
       setError(
         decision === "REJECTED"
           ? "A comment is required when rejecting a document."
           : "A comment is required when requesting changes."
       );
       return;
     }
    const mapped: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" = decision === "CHANGES" ? "CHANGES_REQUESTED" : decision;
    const updated = reviewDocument(doc.id, mapped, comment.trim());
    if (!updated) {
      setError("Could not apply the review decision.");
      return;
    }
    setComment("");
    setFlash(
      decision === "APPROVED"
        ? "Document approved."
        : decision === "REJECTED"
          ? "Document rejected."
          : "Changes requested — document returned to the employee."
    );
    bump();
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={doc.name}
        description={`${doc.type.replace(/_/g, " ")} — ${doc.id}`}
        breadcrumbs={[{ label: "Documents", href: ROUTES.DOCUMENTS }, { label: doc.name }]}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary text-sm" title="Download (mock)"><Download size={15} /> Download</button>
            {employee && (
              <NavLink className="btn btn-secondary text-sm" to={ROUTES.EMPLOYEE_DETAIL(employee.id)}>
                View Employee
              </NavLink>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Document Preview</h3>
          </div>
          <div className="border border-gray-200 rounded-md bg-gray-50 p-8 text-center flex flex-col items-center justify-center min-h-80">
            <svg viewBox="0 0 24 32" className="w-20 h-24 text-gray-400" fill="currentColor" aria-hidden="true">
              <path d="M2 0h14l6 6v26H2z" opacity="0.3" />
              <path d="M16 0l6 6h-6z" opacity="0.6" />
              <path d="M5 12h14M5 16h14M5 20h10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
            </svg>
            <p className="text-sm font-medium text-gray-700 mt-4">{doc.name}</p>
            <p className="text-xs text-gray-500">{doc.type.replace(/_/g, " ")} — mock preview</p>
            <p className="text-xs text-gray-400 mt-2">Uploaded {fmtDateTime(doc.uploadedAt)}</p>
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Document Information</h3>
          <dl className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              {employee && <EmployeeAvatar firstName={employee.firstName} lastName={employee.lastName} avatar={employee.avatar} size="sm" />}
              <div><dt className="text-xs text-gray-500 uppercase tracking-wider">Employee</dt>
              <dd className="text-gray-900">{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</dd></div>
            </div>
            <div><dt className="text-xs text-gray-500 uppercase tracking-wider">Document Type</dt><dd className="text-gray-900">{doc.type.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-xs text-gray-500 uppercase tracking-wider">Uploaded Date</dt><dd className="text-gray-900">{fmtDateTime(doc.uploadedAt)}</dd></div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Expiry Date</dt>
              <dd className="flex items-center gap-2">
                <span className="text-gray-900">{doc.expiryDate ?? "—"}</span>
                {expiryState === "EXPIRED" && <StatusBadge status="EXPIRED" />}
                {expiryState === "EXPIRING_SOON" && <span className="badge badge-warning">EXPIRING SOON</span>}
              </dd>
              {doc.expiryDate && <p className="text-xs text-gray-500 mt-1">{formatExpiry(doc)}</p>}
            </div>
            <div><dt className="text-xs text-gray-500 uppercase tracking-wider">Status</dt><dd><StatusBadge status={doc.status} /></dd></div>
            <div><dt className="text-xs text-gray-500 uppercase tracking-wider">Reviewer</dt><dd className="text-gray-900">{reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : doc.reviewedBy ?? "—"}</dd></div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Comments</dt>
              <dd className="text-gray-700">{doc.comments ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
      {canReview ? (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Review Actions</h3>
          <p className="text-xs text-gray-500 mb-4">Reject and Request Changes require a comment.</p>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>}
          {flash && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">{flash}</div>}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Review comment (required for Reject / Request Changes)..."
            rows={3}
            className="w-full"
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="btn btn-primary text-sm" onClick={() => decide("APPROVED")}>Approve</button>
            <button className="btn btn-secondary text-sm" onClick={() => decide("CHANGES")}>Request Changes</button>
            <button className="btn btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50" onClick={() => decide("REJECTED")}>Reject</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Review Actions</h3>
          <p className="text-sm text-gray-500">You do not have permission to review documents. HR and Admin reviewers can approve, reject, or request changes here.</p>
        </div>
      )}
    </div>
  );
}
