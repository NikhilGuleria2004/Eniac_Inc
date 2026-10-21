import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Download, CheckCircle2, Ban, Plus, Trash2, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import {
  getInvoiceById,
  getTimesheetById,
  getEmployees,
  sendInvoice,
  markPaidInvoice,
  voidInvoice,
  addLineItem,
  updateLineItem,
  removeLineItem,
  reorderLineItems,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { getApiBaseUrl, getAccessToken, refreshAccessToken, clearTokens } from "../../lib/api";
import { isInvoiceOverdue, computeInvoiceTotals, formatInvoiceDate } from "./invoices";
import { InvoiceEmailModal } from "./InvoiceEmailModal";
import type { Invoice, InvoiceLineItem, Employee } from "../../types";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | undefined>(() => getInvoiceById(invoiceId));
  const [emailOpen, setEmailOpen] = useState(false);

  const sourceTimesheets = useMemo(
    () => (invoice?.timesheetIds ?? []).map((id) => getTimesheetById(id)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [invoice]
  );
  const employees = useMemo(() => getEmployees(), []);
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) map.set(emp.id, emp);
    return map;
  }, [employees]);

  if (!invoice) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Invoice not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(ROUTES.INVOICES)}>Back to Invoices</button>
      </div>
    );
  }

  const apply = (fn: () => Invoice | undefined) => {
    const updated = fn();
    if (updated) setInvoice({ ...updated });
  };
  const editable = invoice.status === "DRAFT";
  const canSend = hasPermission(user?.role ?? "EMPLOYEE", "invoice.send");
  const canEdit = hasPermission(user?.role ?? "EMPLOYEE", "invoice.edit");

  const downloadPdf = async () => {
    try {
      const fetchWithAuth = async (attempt: number): Promise<Response> => {
        let token = getAccessToken();
        const res = await fetch(`${getApiBaseUrl()}/invoices/${encodeURIComponent(invoice.id)}/pdf?download=1`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok && res.status === 401 && attempt === 0) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return fetchWithAuth(1);
          }
          clearTokens();
          throw new Error("Session expired. Please log in again.");
        }
        return res;
      };

      const res = await fetchWithAuth(0);
      if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "PDF download failed");
    }
  };

  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => apply(() => updateLineItem(invoice.id, id, patch));
  const totals = computeInvoiceTotals(invoice.lineItems, invoice.taxRate);

  const activity = [
    { label: "Invoice created", at: invoice.createdAt },
    ...(invoice.sentAt ? [{ label: "Sent", at: invoice.sentAt }] : []),
    ...(invoice.paidAt ? [{ label: "Paid", at: invoice.paidAt }] : []),
    { label: "Last updated", at: invoice.updatedAt },
  ];

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">#{invoice.invoiceNumber}</h1>
            {isInvoiceOverdue(invoice) ? <span className="badge badge-warning">Overdue</span> : <StatusBadge status={invoice.status} kind="invoice" />}
          </div>
          <p className="text-sm text-gray-500">
            {invoice.clientName} · Due {formatInvoiceDate(invoice.dueDate)} · Balance Due <span className="font-medium text-gray-900">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          {editable && canEdit && (
            <button className="btn btn-secondary" onClick={() => navigate(ROUTES.INVOICE_EDIT.replace(":invoiceId", invoice.id))}><Pencil size={16} className="mr-2" />Edit</button>
          )}
          {invoice.status === "DRAFT" && canSend && (
            <button className="btn btn-primary" onClick={() => setEmailOpen(true)}><Send size={16} className="mr-2" />Send</button>
          )}
          {["SENT", "OVERDUE", "PARTIAL"].includes(invoice.status) && (
            <button className="btn btn-primary" onClick={() => { apply(() => markPaidInvoice(invoice.id)); addToast("success", "Invoice marked paid"); }}><CheckCircle2 size={16} className="mr-2" />Mark Paid</button>
          )}
          {["DRAFT", "SENT", "OVERDUE", "PARTIAL"].includes(invoice.status) && (
            <button className="btn btn-secondary" onClick={() => { apply(() => voidInvoice(invoice.id)); addToast("success", "Invoice voided"); }}><Ban size={16} className="mr-2" />Void</button>
          )}
          <button className="btn btn-secondary" onClick={() => void downloadPdf()}><Download size={16} className="mr-2" />Download PDF</button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
          <TabsTrigger value="source">Source Data</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">From</p>
                <p className="text-sm text-gray-900">Eniac Inc.</p>
                <p className="text-sm text-gray-500">California, U.S.A</p>
                <p className="text-sm text-gray-500">hr@eniacinc.com</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold tracking-widest text-gray-400">INVOICE</h2>
                <p className="text-sm font-medium text-gray-900">#{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bill To</p>
                <p className="text-sm text-gray-900">{invoice.clientName}</p>
                {invoice.clientAddress && (
                  <p className="text-sm text-gray-500">{invoice.clientAddress.city}, {invoice.clientAddress.state} {invoice.clientAddress.postalCode}, {invoice.clientAddress.country}</p>
                )}
              </div>
              <div className="text-right text-sm">
                <div className="flex justify-end gap-4"><span className="text-gray-500">Invoice Date</span><span className="text-gray-900">{formatInvoiceDate(invoice.issueDate)}</span></div>
                <div className="flex justify-end gap-4"><span className="text-gray-500">Terms</span><span className="text-gray-900">{invoice.paymentTerms.replace(/_/g, " ")}</span></div>
                <div className="flex justify-end gap-4"><span className="text-gray-500">Due Date</span><span className="text-gray-900">{formatInvoiceDate(invoice.dueDate)}</span></div>
                {invoice.poNumber && <div className="flex justify-end gap-4"><span className="text-gray-500">P.O.#</span><span className="text-gray-900">{invoice.poNumber}</span></div>}
              </div>
            </div>
            {invoice.periodLabel && <p className="mt-3 text-sm text-gray-700">Period: <span className="text-gray-900">{invoice.periodLabel}</span></p>}
            <p className="mt-1 text-sm text-gray-700">Subject: <span className="text-gray-900">{invoice.subject}</span></p>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <p className="text-gray-600">Sub Total: <span className="ml-2 text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span></p>
              <p className="text-gray-600">Tax ({invoice.taxRate}%): <span className="ml-2 text-gray-900">{formatCurrency(invoice.taxAmount, invoice.currency)}</span></p>
              <p className="font-semibold text-gray-900">Total: <span className="ml-2">{formatCurrency(invoice.totalAmount, invoice.currency)}</span></p>
              <p className="font-semibold text-gray-900">Balance Due: <span className="ml-2">{formatCurrency(invoice.balanceDue, invoice.currency)}</span></p>
              <p className="text-gray-600">Amount Paid: <span className="ml-2 text-gray-900">{formatCurrency(invoice.amountPaid, invoice.currency)}</span></p>
            </div>
            {invoice.notes && <p className="mt-4 text-sm text-gray-600">Notes: {invoice.notes}</p>}
          </div>
        </TabsContent>

        <TabsContent value="line-items" className="space-y-4 pt-6">
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 px-2 w-10">#</th><th className="py-2 px-2">Item & Description</th>
                  <th className="py-2 px-2 w-24">Qty</th><th className="py-2 px-2 w-32">Rate</th>
                  <th className="py-2 px-2 w-32">Amount</th>{editable && <th className="py-2 px-2 w-28">Actions</th>}
                </tr></thead>
                <tbody>
                  {invoice.lineItems.length === 0 && (
                    <tr><td colSpan={editable ? 6 : 5} className="py-6 text-center text-gray-500">No line items.</td></tr>
                  )}
                  {invoice.lineItems.map((li, i) => (
                    <tr key={li.id} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-2">
                        {editable ? <input className="form-input py-1" value={li.description} onChange={(e) => updateLine(li.id, { description: e.target.value })} />
                          : <span className="text-gray-900">{li.description}</span>}
                      </td>
                      <td className="py-2 px-2">
                        {editable ? <input type="number" step={0.01} min={0} className="form-input py-1 w-20" value={li.quantity} onChange={(e) => updateLine(li.id, { quantity: Number(e.target.value) })} />
                          : li.quantity.toFixed(2)}
                      </td>
                      <td className="py-2 px-2">
                        {editable ? <input type="number" step={0.01} min={0} className="form-input py-1 w-28" value={li.rate} onChange={(e) => updateLine(li.id, { rate: Number(e.target.value) })} />
                          : formatCurrency(li.rate, invoice.currency)}
                      </td>
                      <td className="py-2 px-2 text-gray-900">{formatCurrency(li.amount, invoice.currency)}</td>
                      {editable && (
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <button className="text-gray-400 hover:text-gray-700" onClick={() => apply(() => reorderLineItems(invoice.id, i, i - 1))} aria-label="Move up"><ChevronUp size={14} /></button>
                            <button className="text-gray-400 hover:text-gray-700" onClick={() => apply(() => reorderLineItems(invoice.id, i, i + 1))} aria-label="Move down"><ChevronDown size={14} /></button>
                            <button className="text-gray-400 hover:text-danger" onClick={() => apply(() => removeLineItem(invoice.id, li.id))} aria-label="Remove"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editable && (
              <button className="mt-3 text-sm text-accent hover:underline" onClick={() => apply(() => addLineItem(invoice.id, { description: "", quantity: 1, rate: 0, amount: 0, manual: true }))}>
                <Plus size={14} className="inline" /> Add Line Item
              </button>
            )}
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <p className="text-gray-600">Sub Total: <span className="ml-2 text-gray-900">{formatCurrency(totals.subtotal, invoice.currency)}</span></p>
              <p className="text-gray-600">Tax: <span className="ml-2 text-gray-900">{formatCurrency(totals.taxAmount, invoice.currency)}</span></p>
              <p className="font-semibold text-gray-900">Total: <span className="ml-2">{formatCurrency(totals.totalAmount, invoice.currency)}</span></p>
              <p className="font-semibold text-gray-900">Balance Due: <span className="ml-2">{formatCurrency(invoice.balanceDue, invoice.currency)}</span></p>
            </div>
            {!editable && <p className="mt-2 text-xs text-gray-400">Line items are read-only unless the invoice is in DRAFT.</p>}
          </div>
        </TabsContent>

        <TabsContent value="source" className="pt-6">
          <div className="card">
            {sourceTimesheets.length === 0 ? (
              <p className="text-sm text-gray-500">This is a manual invoice — line items were added directly.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 px-3">Employee</th><th className="py-2 px-3">Tech Role</th><th className="py-2 px-3">Project</th><th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Billable Hours</th><th className="py-2 px-3">Bill Rate</th><th className="py-2 px-3">Billable Amount</th><th className="py-2 px-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {sourceTimesheets.flatMap((ts) =>
                      ts.projectBreakdown.map((pb) => {
                        const emp = employeeMap.get(ts.employeeId);
                        return (
                        <tr key={`${ts.id}-${pb.projectId}`} className="border-b border-gray-100">
                          <td className="py-2 px-3">{ts.employeeName}</td>
                          <td className="py-2 px-3">{emp?.techRole ?? emp?.designation ?? "—"}</td>
                          <td className="py-2 px-3">{pb.projectName}</td>
                          <td className="py-2 px-3">{ts.periodLabel}</td>
                          <td className="py-2 px-3">{pb.billableHours} h</td>
                          <td className="py-2 px-3">{formatCurrency(pb.employeeBillRate)}/h</td>
                          <td className="py-2 px-3">{formatCurrency(pb.billableAmount)}</td>
                          <td className="py-2 px-3"><StatusBadge status={ts.status} kind="timesheet" /></td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ul className="card divide-y divide-gray-100 text-sm">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-gray-900">{a.label}</span>
                <span className="text-gray-500">{new Date(a.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <InvoiceEmailModal
        open={emailOpen}
        invoice={invoice}
        clientEmail=""
        onClose={() => setEmailOpen(false)}
          onSend={(id, email) => {
            apply(() => sendInvoice(id, email.to || "unknown"));
          addToast("success", `Invoice sent to ${email.to} (simulated)`);
          setEmailOpen(false);
        }}
      />
    </div>
  );
}
