import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Pencil, Send, CheckCircle2, AlertTriangle, Ban, Plus, Search, DollarSign } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { getInvoices, getClients, sendInvoice, markPaidInvoice, voidInvoice } from "../../data/mock/repositories";
import { INVOICE_STATUSES, ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { computeInvoiceKPIs, filterInvoices, isInvoiceOverdue } from "./invoices";
import { InvoiceEmailModal } from "./InvoiceEmailModal";

export function InvoicesDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("all");
  const [status, setStatus] = useState("all");
  const [po, setPo] = useState("");
  const [emailFor, setEmailFor] = useState<string | null>(null);

  const invoices = useMemo(() => getInvoices(), []);
  const clients = useMemo(() => getClients(), []);
  const kpis = useMemo(() => computeInvoiceKPIs(invoices), [invoices]);

  const filtered = useMemo(() => filterInvoices(invoices, { search, client, status, po }), [invoices, search, client, status, po]);
  const hasFilters = search !== "" || client !== "all" || status !== "all" || po !== "";

  const clientOptions = [{ label: "All Clients", value: "all" }, ...clients.map((c) => ({ label: c.name, value: c.id }))];
  const statusOptions = [{ label: "All Statuses", value: "all" }, ...INVOICE_STATUSES.map((s) => ({ label: s, value: s }))];

  const canCreate = hasPermission(user?.role ?? "EMPLOYEE", "invoice.create");
  const emailInvoice = emailFor ? invoices.find((i) => i.id === emailFor || i.invoiceNumber === emailFor) ?? null : null;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Invoice Management"
        subtitle="Professional-services billing and aging"
        actions={
          canCreate && (
            <button className="btn btn-primary" onClick={() => navigate(ROUTES.INVOICE_NEW)}>
              <Plus size={16} className="mr-2" />
              New Invoice
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total Invoices" value={kpis.total} icon={<FileText size={20} />} />
        <StatCard label="Draft" value={kpis.draft} icon={<Pencil size={20} />} />
        <StatCard label="Sent" value={kpis.sent} icon={<Send size={20} />} variant="info" />
        <StatCard label="Paid" value={kpis.paid} icon={<CheckCircle2 size={20} />} variant="success" />
        <StatCard label="Overdue" value={kpis.overdue} icon={<AlertTriangle size={20} />} variant={kpis.overdue > 0 ? "danger" : "default"} />
        <StatCard label="Void" value={kpis.void} icon={<Ban size={20} />} />
        <StatCard label="Total Billed" value={formatCurrency(kpis.totalBilled)} icon={<DollarSign size={20} />} variant="success" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by number, client, status, amount..." className="form-input pl-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={client} onChange={(e) => setClient(e.target.value)}>{clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Input value={po} onChange={(e) => setPo(e.target.value)} placeholder="Filter by PO #" />
            {hasFilters && (
              <button className="self-start text-sm text-accent hover:underline" onClick={() => { setSearch(""); setClient("all"); setStatus("all"); setPo(""); }}>Clear filters</button>
            )}
          </div>
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(i) => i.id}
          onRowClick={(i) => navigate(ROUTES.INVOICE_DETAIL.replace(":invoiceId", i.id))}
          emptyState={{ title: "No invoices found", description: hasFilters ? "Try adjusting your filters or search." : "Create your first invoice to get started." }}
          columns={[
            { key: "invoiceNumber", header: "Invoice #", cell: (i) => <span className="font-medium text-gray-900">{i.invoiceNumber}</span> },
            { key: "clientName", header: "Client", cell: (i) => i.clientName },
            { key: "issueDate", header: "Invoice Date", cell: (i) => i.issueDate },
            { key: "dueDate", header: "Due Date", cell: (i) => i.dueDate },
            { key: "poNumber", header: "PO #", cell: (i) => i.poNumber ?? "—" },
            { key: "subtotal", header: "Subtotal", cell: (i) => formatCurrency(i.subtotal, i.currency) },
            { key: "taxAmount", header: "Tax", cell: (i) => formatCurrency(i.taxAmount, i.currency) },
            { key: "totalAmount", header: "Total", cell: (i) => formatCurrency(i.totalAmount, i.currency) },
            { key: "status", header: "Status", cell: (i) => (isInvoiceOverdue(i) ? <span className="badge badge-warning">Overdue</span> : <StatusBadge status={i.status} kind="invoice" />) },
            {
              key: "actions",
              header: "Actions",
              cell: (i) => (
                <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {i.status === "DRAFT" && (
                    <button className="text-accent hover:underline text-sm" onClick={() => setEmailFor(i.id)}>Send</button>
                  )}
                  {["SENT", "OVERDUE", "PARTIAL"].includes(i.status) && (
                    <button className="text-success hover:underline text-sm" onClick={() => { markPaidInvoice(i.id); addToast("success", `${i.invoiceNumber} marked paid`); }}>Mark Paid</button>
                  )}
                  {["DRAFT", "SENT", "OVERDUE", "PARTIAL"].includes(i.status) && (
                    <button className="text-gray-500 hover:text-danger text-sm" onClick={() => { voidInvoice(i.id); addToast("success", `${i.invoiceNumber} voided`); }}>Void</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {emailInvoice && (
        <InvoiceEmailModal
          open={!!emailFor}
          invoice={emailInvoice}
          clientEmail={clients.find((c) => c.id === emailInvoice.clientId)?.primaryContact.email ?? ""}
          onClose={() => setEmailFor(null)}
          onSend={(id, email) => {
            sendInvoice(id, email.to || "unknown");
            addToast("success", `Invoice sent to ${email.to} (simulated)`);
            setEmailFor(null);
          }}
        />
      )}
    </div>
  );
}
