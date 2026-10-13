import { useMemo, useState } from "react";
import { NavLink, useNavigate, Navigate } from "react-router-dom";
import { Download, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import type { Document } from "../../types";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { createDocument, getDocuments, getEmployeeById, getEmployees, updateDocument } from "../../data/mock/repositories";
import { COUNTRIES, ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/tables/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/data/StatusBadge";
import { StatCard } from "../../components/data/StatCard";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { Modal } from "../../components/ui/Modal";
import { FileUpload } from "../../components/ui/FileUpload";
import { formatExpiry, filterDocuments, getDocumentKpis, getExpiryState, scopeDocumentsForRole } from "./documents";
const DOC_TYPES = ["RESUME", "OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF", "TAX_DOCUMENT", "BANK_DOCUMENT", "CERTIFICATE", "NDA", "OTHER"] as const;
const DOC_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"] as const;
const PAGE_SIZE = 10;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

export function DocumentListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "EMPLOYEE";
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Document | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<Document | null>(null);

  const employees = useMemo(() => getEmployees(), []);
  const canManage = hasPermission(role, "document.manage");
  const canReview = hasPermission(role, "document.review");
  // §17/§18: Supervisor and Employee see their own documents only.
  const scoped = useMemo(
    () => scopeDocumentsForRole(getDocuments(), role, user?.id),
    [role, user?.id, version]
  );
  const kpis = useMemo(() => getDocumentKpis(scoped), [scoped]);
  const filtered = useMemo(
    () => filterDocuments(scoped, employees, { search, employeeId: employeeFilter, type: typeFilter, status: statusFilter, expiry: expiryFilter, country: countryFilter }),
    [scoped, employees, search, employeeFilter, typeFilter, statusFilter, expiryFilter, countryFilter]
  );
  const employeeOptions = useMemo(() => {
    const ids = new Set(scoped.map((d) => d.employeeId));
    return employees.filter((e) => ids.has(e.id));
  }, [scoped, employees]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };
  const canReplace = (d: Document) => canManage || (role === "EMPLOYEE" && d.employeeId === user?.id);

  if (!hasPermission(role, "document.view")) return <Navigate to="/403" replace />;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Document Management"
        description="Upload, review, and track employee documents."
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          <button className="btn btn-primary text-sm" onClick={() => setUploadOpen(true)}>
            <Plus size={16} /> Upload Document
          </button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total Documents" value={kpis.total} />
        <StatCard label="Pending Review" value={kpis.pendingReview} />
        <StatCard label="Approved" value={kpis.approved} />
        <StatCard label="Rejected" value={kpis.rejected} />
        <StatCard label="Expiring Soon" value={kpis.expiringSoon} />
        <StatCard label="Expired" value={kpis.expired} />
      </div>
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <SearchInput placeholder="Search documents or employees..." value={search} onChange={(v) => { setSearch(v); resetPage(); }} className="w-full xl:max-w-sm" />
          <FilterBar
            filters={[
              { key: "employee", label: "Employee", value: employeeFilter, options: [{ label: "All Employees", value: "all" }, ...employeeOptions.map((e) => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))], onChange: (v) => { setEmployeeFilter(v); resetPage(); } },
              { key: "type", label: "Type", value: typeFilter, options: [{ label: "All Types", value: "all" }, ...DOC_TYPES.map((t) => ({ label: t.replace(/_/g, " "), value: t }))], onChange: (v) => { setTypeFilter(v); resetPage(); } },
              { key: "status", label: "Status", value: statusFilter, options: [{ label: "All Statuses", value: "all" }, ...DOC_STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s }))], onChange: (v) => { setStatusFilter(v); resetPage(); } },
              { key: "expiry", label: "Expiry", value: expiryFilter, options: [{ label: "Any Expiry", value: "all" }, { label: "Expiring Soon", value: "EXPIRING_SOON" }, { label: "Expired", value: "EXPIRED" }, { label: "Valid", value: "VALID" }, { label: "No Expiry", value: "NO_EXPIRY" }], onChange: (v) => { setExpiryFilter(v); resetPage(); } },
              { key: "country", label: "Country", value: countryFilter, options: [{ label: "All Countries", value: "all" }, ...COUNTRIES.map((c) => ({ label: c, value: c }))], onChange: (v) => { setCountryFilter(v); resetPage(); } },
            ]}
            onClearAll={() => { setSearch(""); setEmployeeFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setExpiryFilter("all"); setCountryFilter("all"); resetPage(); }}
          />
        </div>
      </div>
      <DataTable<Document>
        data={paged}
        keyExtractor={(d) => d.id}
        onRowClick={(d) => navigate(ROUTES.DOCUMENT_DETAIL(d.id))}
        emptyState={{ title: "No documents found", description: "Upload a document or adjust your filters." }}
        columns={[
          { key: "name", header: "Document", sortable: true, cell: (d) => (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500"><Eye size={14} /></div>
              <div>
                <NavLink to={ROUTES.DOCUMENT_DETAIL(d.id)} onClick={(e) => e.stopPropagation()} className="font-medium text-gray-900 hover:text-accent hover:underline">{d.name}</NavLink>
                <p className="text-xs text-gray-500">{d.id}</p>
              </div>
            </div>
          ) },
          { key: "employee", header: "Employee", sortable: true, cell: (d) => {
            const e = getEmployeeById(d.employeeId);
            return (
              <div className="flex items-center gap-2">
                <EmployeeAvatar firstName={e?.firstName} lastName={e?.lastName} avatar={e?.avatar} size="sm" />
                <span className="text-gray-700">{empName(d.employeeId)}</span>
              </div>
            );
          } },
          { key: "type", header: "Type", sortable: true, cell: (d) => <span className="text-gray-600">{d.type.replace(/_/g, " ")}</span> },
          { key: "uploadedAt", header: "Uploaded", sortable: true, cell: (d) => <span className="text-gray-600">{fmtDate(d.uploadedAt)}</span> },
          { key: "status", header: "Status", sortable: true, cell: (d) => <StatusBadge status={d.status} /> },
          { key: "expiry", header: "Expiry", sortable: true, cell: (d) => {
            const state = getExpiryState(d);
            return (
              <span className={state === "EXPIRED" ? "text-red-600 font-medium" : state === "EXPIRING_SOON" ? "text-amber-600 font-medium" : "text-gray-600"}>
                {formatExpiry(d)}
              </span>
            );
          } },
          { key: "reviewer", header: "Reviewer", cell: (d) => <span className="text-gray-600">{d.reviewedBy ? empName(d.reviewedBy) : "—"}</span> },
          { key: "actions", header: "Actions", cell: (d) => (
            <div className="flex items-center gap-1">
              <button title="View" className="p-1 text-gray-500 hover:text-accent" onClick={(e) => { e.stopPropagation(); setPreview(d); }}><Eye size={15} /></button>
              <button title="Download (mock)" className="p-1 text-gray-500 hover:text-accent" onClick={(e) => { e.stopPropagation(); setPreview(d); }}><Download size={15} /></button>
              {canReview && (
                <button title="Review" className="p-1 text-gray-500 hover:text-accent" onClick={(e) => { e.stopPropagation(); navigate(ROUTES.DOCUMENT_DETAIL(d.id)); }}><Pencil size={15} /></button>
              )}
              {canReplace(d) && (
                <button title="Replace" className="p-1 text-gray-500 hover:text-accent" onClick={(e) => { e.stopPropagation(); setReplaceTarget(d); }}><RefreshCw size={15} /></button>
              )}
            </div>
          ) },
        ]}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Showing {(safePage - 1) * PAGE_SIZE + (paged.length > 0 ? 1 : 0)} to {(safePage - 1) * PAGE_SIZE + paged.length} of {filtered.length} documents</p>
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>
      {preview && <PreviewModal doc={preview} onClose={() => setPreview(null)} employees={employees} />}
      {uploadOpen && (
        <UploadDocumentModal
          employees={employees}
          fixedEmployeeId={role === "EMPLOYEE" ? user?.id : undefined}
          onClose={() => setUploadOpen(false)}
          onSaved={() => { setUploadOpen(false); bump(); }}
        />
      )}
      {replaceTarget && (
        <UploadDocumentModal
          key={replaceTarget.id}
          employees={employees}
          fixedEmployeeId={role === "EMPLOYEE" ? user?.id : undefined}
          existing={replaceTarget}
          onClose={() => setReplaceTarget(null)}
          onSaved={() => { setReplaceTarget(null); bump(); }}
        />
      )}
    </div>
  );
}

function PreviewModal({ doc, onClose, employees }: { doc: Document; onClose: () => void; employees: ReturnType<typeof getEmployees> }) {
  const emp = employees.find((e) => e.id === doc.employeeId);
  return (
    <Modal open onClose={onClose} title={doc.name} description={`${doc.type.replace(/_/g, " ")} — ${doc.id}`} size="lg"
      footer={<button className="btn btn-secondary text-sm" onClick={onClose}>Close</button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-md bg-gray-50 p-6 text-center flex flex-col items-center justify-center min-h-64">
          <svg viewBox="0 0 24 32" className="w-16 h-20 text-gray-400" fill="currentColor" aria-hidden="true">
            <path d="M2 0h14l6 6v26H2z" opacity="0.3" />
            <path d="M16 0l6 6h-6z" opacity="0.6" />
            <path d="M5 12h14M5 16h14M5 20h10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
          </svg>
          <p className="text-xs text-gray-500 mt-4">Document preview (mock)</p>
          <p className="text-sm font-medium text-gray-700">{doc.name}</p>
        </div>
        <div className="space-y-3 text-sm">
          <div><p className="text-xs text-gray-500 uppercase tracking-wider">Employee</p><p className="text-gray-900">{emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase tracking-wider">Document Type</p><p className="text-gray-900">{doc.type.replace(/_/g, " ")}</p></div>
          <div><p className="text-xs text-gray-500 uppercase tracking-wider">Uploaded Date</p><p className="text-gray-900">{new Date(doc.uploadedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p></div>
          <div><p className="text-xs text-gray-500 uppercase tracking-wider">Expiry Date</p><p className="text-gray-900">{doc.expiryDate ?? "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase tracking-wider">Status</p><StatusBadge status={doc.status} /></div>
        </div>
      </div>
    </Modal>
  );
}

function UploadDocumentModal({ employees, fixedEmployeeId, existing, onClose, onSaved }: {
  employees: ReturnType<typeof getEmployees>;
  fixedEmployeeId?: string;
  existing?: Document;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isReplace = Boolean(existing);
  const [employeeId, setEmployeeId] = useState(existing?.employeeId ?? fixedEmployeeId ?? employees[0]?.id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<string>(existing?.type ?? "OTHER");
  const [expiryDate, setExpiryDate] = useState(existing?.expiryDate ?? "");
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const targetEmployeeId = fixedEmployeeId ?? employeeId;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!targetEmployeeId) { setError("Select an employee."); return; }
    if (!name.trim()) { setError("Document name is required."); return; }
    if (isReplace && existing) {
      const updated = updateDocument(existing.id, {
        name: name.trim(),
        type: type as Document["type"],
        expiryDate: expiryDate || undefined,
        uploadedAt: new Date().toISOString(),
        status: "PENDING",
        reviewedBy: undefined,
        comments: undefined,
      });
      if (!updated) { setError("Could not replace document."); return; }
    } else {
      createDocument({
        employeeId: targetEmployeeId,
        name: name.trim(),
        type: type as Document["type"],
        status: "PENDING",
        expiryDate: expiryDate || undefined,
      });
    }
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={isReplace ? "Replace Document" : "Upload Document"}
      description={isReplace ? `Replacing ${existing?.name} — it will return to PENDING for review.` : "Add a document to an employee record (mock upload)."}
      footer={
        <>
          <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="upload-doc-form" className="btn btn-primary text-sm">{isReplace ? "Replace" : "Upload"}</button>
        </>
      }>
      <form id="upload-doc-form" onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        <div>
          <label className="form-label">Employee *</label>
          <select className="form-input" value={targetEmployeeId} disabled={Boolean(fixedEmployeeId)} onChange={(e) => setEmployeeId(e.target.value)}>
            {!fixedEmployeeId && <option value="">Select employee...</option>}
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Document Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Passport Copy" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Document Type *</label>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="form-label">File</label>
          <FileUpload accept={[".pdf", ".png", ".jpg", ".jpeg"]} onUpload={(files) => {
            setFileName(files[0]?.name);
            if (!name.trim() && files[0]) setName(files[0].name.replace(/\.[^.]+$/, ""));
          }} />
          {fileName && <p className="text-xs text-gray-500 mt-1">Selected: {fileName}</p>}
        </div>
      </form>
    </Modal>
  );
}
