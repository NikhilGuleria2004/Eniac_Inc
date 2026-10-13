import { useState } from "react";
import { Upload, Check, X, FileText, Trash2 } from "lucide-react";
import type { Document, Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import {
  getDocumentsByEmployee,
  uploadEmployeeDocument,
  reviewDocument,
  deleteDocument,
} from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Modal } from "../../../components/ui/Modal";
import {
  getRequiredDocumentStatuses,
  REQUIRED_DOCUMENT_TYPES,
} from "../documents";

const ALL_DOCUMENT_TYPES: Document["type"][] = [
  "RESUME",
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "TAX_DOCUMENT",
  "BANK_DOCUMENT",
  "CERTIFICATE",
  "NDA",
  "OTHER",
];

interface Step5DocumentsProps {
  employee: Employee;
  onDocReviewed?: () => void;
}

export function Step5Documents({ employee, onDocReviewed }: Step5DocumentsProps) {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canUpload = hasPermission(role, "document.manage");
  const canReview = hasPermission(role, "document.review");

  const [docs, setDocs] = useState<Document[]>(() =>
    getDocumentsByEmployee(employee.id)
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState<Document["type"]>("RESUME");
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);

  const requiredDocStatuses = getRequiredDocumentStatuses(docs);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    if (!name.trim()) {
      setUploadError("Document name is required.");
      return;
    }
    if (!file) {
      setUploadError("A file attachment is required.");
      return;
    }
    setUploading(true);
    try {
      await uploadEmployeeDocument(employee.id, {
        name: name.trim(),
        type,
        expiryDate: expiry || undefined,
        file,
      });
      setDocs(getDocumentsByEmployee(employee.id));
      setUploadOpen(false);
      setName("");
      setType("RESUME");
      setExpiry("");
      setFile(undefined);
      onDocReviewed?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    const files = ((e.currentTarget as HTMLFormElement).elements.namedItem("bulkFiles") as HTMLInputElement)?.files;
    if (!files || files.length === 0) {
      setUploadError("Please select at least one file.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const detectedType = detectDocTypeFromFile(file.name);
        await uploadEmployeeDocument(employee.id, {
          name: file.name,
          type: detectedType,
          file,
        });
      }
      setDocs(getDocumentsByEmployee(employee.id));
      setBulkOpen(false);
      onDocReviewed?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    deleteDocument(doc.id);
    setDocs(getDocumentsByEmployee(employee.id));
    onDocReviewed?.();
  };

  const handleReview = (doc: Document, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") => {
    if (decision === "APPROVED") {
      reviewDocument(doc.id, decision);
    } else {
      const reason = prompt(`Reason for ${decision === "REJECTED" ? "rejection" : "changes requested"}:`, "");
      if (reason !== null) {
        reviewDocument(doc.id, decision, reason);
      }
    }
    setDocs(getDocumentsByEmployee(employee.id));
    onDocReviewed?.();
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-gray-700 mr-auto">
          Documents ({docs.length} uploaded)
        </h4>
        {canUpload && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setType("OFFER_LETTER");
                setUploadOpen(true);
              }}
              className="btn btn-secondary text-sm"
            >
              <Upload size={14} /> Upload Document
            </button>
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="btn btn-secondary text-sm"
            >
              <FileText size={14} /> Bulk Upload
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Required: {REQUIRED_DOCUMENT_TYPES.map((t) => t.replace(/_/g, " ")).join(", ")} — all must be APPROVED before proceeding.
      </div>

      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Document</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Uploaded</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Expiry</th>
              {(canUpload || canReview) && (
                <th className="text-left py-2 px-3 font-medium text-gray-600">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {requiredDocStatuses.map(({ type: reqType, doc }) => (
              <tr key={reqType} className="border-b border-gray-100 bg-blue-50/50">
                <td className="py-2 px-3">
                  {doc ? doc.name : <span className="italic text-gray-500">Not uploaded</span>}
                </td>
                <td className="py-2 px-3 text-gray-600">
                  {reqType.replace(/_/g, " ")}
                  {!doc && <span className="ml-1 font-medium text-red-600">(required)</span>}
                </td>
                <td className="py-2 px-3 text-gray-600">
                  {doc ? new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) : "—"}
                </td>
                <td className="py-2 px-3">
                  {doc ? <StatusBadge status={doc.status} /> : <span className="text-xs text-gray-400">Missing</span>}
                </td>
                <td className="py-2 px-3 text-gray-600">{doc?.expiryDate ?? "—"}</td>
                {canUpload && (
                  <td className="py-2 px-3">
                    {!doc && (
                      <button
                        type="button"
                        onClick={() => {
                          setType(reqType as Document["type"]);
                          setUploadOpen(true);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        Upload
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {docs
              .filter((d) => !REQUIRED_DOCUMENT_TYPES.includes(d.type))
              .map((d) => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-2 px-3">{d.name}</td>
                  <td className="py-2 px-3 text-gray-600">{d.type.replace(/_/g, " ")}</td>
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(d.uploadedAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 px-3"><StatusBadge status={d.status} /></td>
                  <td className="py-2 px-3 text-gray-600">{d.expiryDate ?? "—"}</td>
                  <td className="py-2 px-3">
                    {canReview && d.status !== "APPROVED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReview(d, "APPROVED")}
                          className="text-green-700 hover:text-green-900 mr-2"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(d, "REJECTED")}
                          className="text-red-700 hover:text-red-900 mr-2"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="text-gray-400 hover:text-gray-700"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {docs.length === 0 && (
        <p className="text-sm text-gray-500">No documents uploaded for this employee.</p>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setName("");
          setType("RESUME");
          setExpiry("");
          setFile(undefined);
          setUploadError("");
        }}
        employee={employee}
        initialType={type}
        onTypeChange={setType}
        name={name}
        onNameChange={setName}
        expiry={expiry}
        onExpiryChange={setExpiry}
        onFileChange={setFile}
        onSubmit={handleUpload}
        loading={uploading}
        error={uploadError}
      />

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          setUploadError("");
        }}
        onSubmit={handleBulkUpload}
        loading={uploading}
        error={uploadError}
      />
    </div>
  );
}

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  initialType: Document["type"];
  onTypeChange: (type: Document["type"]) => void;
  name: string;
  onNameChange: (name: string) => void;
  expiry: string;
  onExpiryChange: (expiry: string) => void;
  onFileChange: (file: File | undefined) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

function UploadDocumentModal({
  open,
  onClose,
  employee,
  initialType,
  onTypeChange,
  name,
  onNameChange,
  expiry,
  onExpiryChange,
  onFileChange,
  onSubmit,
  loading,
  error,
}: UploadDocumentModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Document"
      description={`Attach a document to ${employee.firstName} ${employee.lastName}'s record.`}
      footer={
        <>
          <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="upload-doc-form"
            className="btn btn-primary text-sm"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </>
      }
    >
      <form id="upload-doc-form" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="form-label">Document Name *</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Aadhaar Card"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Document Type *</label>
            <select
              className="form-input"
              value={initialType}
              onChange={(e) => onTypeChange(e.target.value as Document["type"])}
            >
              {ALL_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-input"
              value={expiry}
              onChange={(e) => onExpiryChange(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="form-label">File *</label>
          <input
            type="file"
            className="form-input"
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
          <p className="text-xs text-gray-500 mt-1">
            The document record is stored with its metadata; file storage is not yet wired up.
          </p>
        </div>
      </form>
    </Modal>
  );
}

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

function BulkUploadModal({ open, onClose, onSubmit, loading, error }: BulkUploadModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Upload Documents"
      description="Select multiple files — document type will be auto-detected from the filename."
      footer={
        <>
          <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="bulk-upload-form"
            className="btn btn-primary text-sm"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload All"}
          </button>
        </>
      }
    >
      <form id="bulk-upload-form" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="form-label">Files *</label>
          <input type="file" name="bulkFiles" className="form-input" multiple />
          <p className="text-xs text-gray-500 mt-1">
            Filenames are scanned for keywords like "offer", "employment", "id", "address", "resume", "nda", etc.
          </p>
        </div>
      </form>
    </Modal>
  );
}

function detectDocTypeFromFile(filename: string): Document["type"] {
  const lower = filename.toLowerCase();
  if (lower.includes("offer")) return "OFFER_LETTER";
  if (lower.includes("agreement") || lower.includes("employment")) return "EMPLOYMENT_AGREEMENT";
  if (lower.includes("id") || lower.includes("passport") || lower.includes("aadhaar")) return "ID_PROOF";
  if (lower.includes("address") || lower.includes("utility") || lower.includes("residence")) return "ADDRESS_PROOF";
  if (lower.includes("resume") || lower.includes("cv")) return "RESUME";
  if (lower.includes("tax") || lower.includes("pan")) return "TAX_DOCUMENT";
  if (lower.includes("bank") || lower.includes("cheque")) return "BANK_DOCUMENT";
  if (lower.includes("certificate")) return "CERTIFICATE";
  return "OTHER";
}
