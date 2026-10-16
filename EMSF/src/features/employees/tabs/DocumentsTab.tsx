import { useState } from "react";
import { Upload } from "lucide-react";
import type { Document, Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import { getDocumentsByEmployee, uploadEmployeeDocument } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Modal } from "../../../components/ui/Modal";

const DOCUMENT_TYPES: Document["type"][] = [
  "RESUME",
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "TAX_DOCUMENT",
  "BANK_DOCUMENT",
  "CERTIFICATE",
  "NDA",
  "OTHER"
];

export function DocumentsTab({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canUpload = hasPermission(role, "document.manage");

  const [docs, setDocs] = useState<Document[]>(() => getDocumentsByEmployee(employee.id));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Document["type"]>("RESUME");
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const openUpload = () => {
    setName("");
    setType("RESUME");
    setExpiry("");
    setFile(undefined);
    setError("");
    setUploadOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Document name is required.");
      return;
    }
    setSaving(true);
    try {
      await uploadEmployeeDocument(employee.id, {
        name: name.trim(),
        type,
        expiryDate: expiry || undefined,
        file
      });
      setDocs(getDocumentsByEmployee(employee.id));
      setUploadOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Documents ({docs.length})</h3>
        {canUpload && (
          <button type="button" onClick={openUpload} className="btn btn-secondary text-sm">
            <Upload aria-hidden="true" size={14} /> Upload Document
          </button>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-gray-500">No documents uploaded for this employee.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Document</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Uploaded</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-900">{d.name}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadOpen && (
        <Modal
          open
          onClose={() => setUploadOpen(false)}
          title="Upload Document"
          description={`Attach a document to ${employee.firstName} ${employee.lastName}'s record.`}
          footer={
            <>
              <button type="button" className="btn btn-secondary text-sm" onClick={() => setUploadOpen(false)}>Cancel</button>
              <button type="submit" form="upload-doc-form" className="btn btn-primary text-sm" disabled={saving}>{saving ? "Uploading…" : "Upload"}</button>
            </>
          }
        >
          <form id="upload-doc-form" onSubmit={submit} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
            <div>
              <label className="form-label" htmlFor="document-name">Document Name *</label>
              <input id="document-name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aadhaar Card" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="document-type">Document Type *</label>
                <select id="document-type" className="form-input" value={type} onChange={(e) => setType(e.target.value as Document["type"])}>
                  {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="expiry-date">Expiry Date</label>
                <input id="expiry-date" type="date" className="form-input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="file">File</label>
              <input id="file" type="file" className="form-input" onChange={(e) => setFile(e.target.files?.[0])} />
              <p className="text-xs text-gray-500 mt-1">The document record is stored with its metadata; file storage is not yet wired up.</p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
