import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Send, Plus, Trash2, ChevronUp, ChevronDown, RefreshCw, AlertTriangle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { formatCurrency } from "../../lib/charts";
import {
  getInvoice,
  createInvoice,
  updateInvoiceHeader,
  previewLineItems,
  sendInvoice,
  syncLineItems,
  getApprovedPeriodOptions,
  findOverlappingInvoices,
  listInvoiceTemplates,
  type OverlappingInvoice,
} from "../../data/invoices.api";
import { getClients } from "../../data/mock/repositories";
import { PAYMENT_TERMS, CURRENCIES, ROUTES } from "../../data/constants";
import { computeInvoiceTotals, dueDateFromTerms, todayIso, formatInvoiceDate } from "./invoices";
import { InvoiceEmailModal } from "./InvoiceEmailModal";
import type { Client, Invoice, InvoiceLineItem, InvoiceTemplate } from "../../types";

let localSeq = 0;
function tempLineId(): string {
  localSeq += 1;
  return `LI-t-${Date.now()}-${localSeq}`;
}

function pickHeader(invoice: Invoice) {
  return {
    poNumber: invoice.poNumber ?? "",
    subject: invoice.subject,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    paymentTerms: invoice.paymentTerms,
    taxRate: invoice.taxRate,
    notes: invoice.notes ?? "",
    termsAndConditions: invoice.termsAndConditions ?? "",
    templateId: invoice.templateId ?? "",
  };
}

/**
 * Single-surface invoice composer (create + edit).
 *
 * Replaces the old 3-step wizard and the quick-create modal. Key properties:
 * - Line items come from the server's `preview-auto-populate`, so grouping
 *   matches the generated PDF exactly (demo mode falls back client-side).
 * - Writes are awaited; server validation errors render inline instead of
 *   optimistic toasts.
 * - Edit mode autosaves (debounced header PATCH + line-item diff sync).
 * - The period picker offers only periods that actually have approved
 *   timesheets, and a duplicate guard flags overlapping open invoices.
 */
export function InvoiceComposerPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isEdit = Boolean(invoiceId);

  const role = user?.role ?? "EMPLOYEE";
  const canCreate = hasPermission(role, "invoice.create");
  const canEdit = hasPermission(role, "invoice.edit");
  const canSend = hasPermission(role, "invoice.send");

  // ── form state ────────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState("");
  const [periodChoice, setPeriodChoice] = useState(""); // "start|end" | "custom" | "none"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [subject, setSubject] = useState("Professional Consulting");
  const [poNumber, setPoNumber] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [paymentTerms, setPaymentTerms] = useState<Invoice["paymentTerms"]>("NET_30");
  const [dueDate, setDueDate] = useState(() => dueDateFromTerms(todayIso(), "NET_30"));
  const [currency, setCurrency] = useState<Invoice["currency"]>("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);

  // ── flow state ────────────────────────────────────────────────────────────
  const [invoice, setInvoice] = useState<Invoice | null>(null); // edit-mode entity
  const [baselineHeader, setBaselineHeader] = useState<ReturnType<typeof pickHeader> | null>(null);
  const [baselineLines, setBaselineLines] = useState<InvoiceLineItem[] | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [formError, setFormError] = useState<{ message: string; fields?: Record<string, string[]> } | null>(null);
  const [overlaps, setOverlaps] = useState<OverlappingInvoice[]>([]);
  const [emailFor, setEmailFor] = useState<Invoice | null>(null);

  const clients = useMemo(() => getClients(), []);
  const client = clients.find((c) => c.id === clientId);
  const periodOptions = useMemo(() => (clientId ? getApprovedPeriodOptions(clientId) : []), [clientId]);
  const { subtotal, taxAmount, totalAmount } = computeInvoiceTotals(lineItems, taxRate);
  const balanceDue = totalAmount - Number(invoice?.amountPaid ?? 0);

  const period = periodChoice.includes("|") ? periodChoice : periodChoice === "custom" && customStart && customEnd ? `${customStart}|${customEnd}` : "";
  const [periodStart, periodEnd] = period.split("|");

  // ── edit mode: load the draft ─────────────────────────────────────────────
  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    (async () => {
      try {
        const inv = await getInvoice(invoiceId);
        if (cancelled) return;
        if (inv.status !== "DRAFT") {
          addToast("warning", "Only draft invoices can be edited here.");
          navigate(ROUTES.INVOICE_DETAIL.replace(":invoiceId", inv.id), { replace: true });
          return;
        }
        setInvoice(inv);
        setClientId(inv.clientId);
        setPeriodChoice(inv.periodStart && inv.periodEnd ? `${inv.periodStart}|${inv.periodEnd}` : "none");
        setSubject(inv.subject);
        setPoNumber(inv.poNumber ?? "");
        setIssueDate(inv.issueDate);
        setPaymentTerms(inv.paymentTerms);
        setDueDate(inv.dueDate);
        setCurrency(inv.currency);
        setTaxRate(inv.taxRate);
        setNotes(inv.notes ?? "");
        setTerms(inv.termsAndConditions ?? "");
        setTemplateId(inv.templateId ?? "");
        setLineItems(inv.lineItems);
        setSourceIds(inv.timesheetIds ?? []);
        setBaselineHeader(pickHeader(inv));
        setBaselineLines(inv.lineItems);
      } catch (error) {
        if (!cancelled) {
          setFormError({ message: error instanceof Error ? error.message : "Invoice was not found." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  // ── create mode: prefill terms when the client changes ────────────────────
  useEffect(() => {
    if (isEdit) return;
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    setPaymentTerms(c.paymentTerms);
    setDueDate(dueDateFromTerms(issueDate, c.paymentTerms));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ── duplicate guard: flag open invoices covering the same period ──────────
  // Uses the server endpoint when available; silently degrades to nothing
  // (rather than a stale local list) if the lookup fails.
  useEffect(() => {
    if (!clientId || !periodStart || !periodEnd) {
      setOverlaps([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const found = await findOverlappingInvoices(
          clientId,
          periodStart,
          periodEnd,
          isEdit ? invoice?.id : undefined
        );
        if (!cancelled) setOverlaps(found);
      } catch {
        if (!cancelled) setOverlaps([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, periodStart, periodEnd, invoice?.id]);

  // ── templates: load once for the branding picker (default pre-selected) ──
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listInvoiceTemplates();
        if (cancelled) return;
        setTemplates(list);
        if (!isEdit && !templateId) {
          const def = list.find((t) => t.isDefault) ?? list[0];
          if (def) {
            setTemplateId(def.id);
            if (def.taxSettings && !taxTouchedRef.current) setTaxRate(def.taxSettings.defaultRate);
            if (def.termsAndConditions && !termsTouchedRef.current && !terms) setTerms(def.termsAndConditions);
          }
        }
      } catch {
        if (!cancelled) setTemplates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── dirty tracking (edit mode) ────────────────────────────────────────────
  const headerPatch = {
    poNumber,
    subject,
    issueDate,
    dueDate,
    currency,
    paymentTerms,
    taxRate,
    notes,
    termsAndConditions: terms,
    templateId: templateId || undefined,
  };
  const headerDirty = isEdit && baselineHeader !== null && JSON.stringify(headerPatch) !== JSON.stringify(baselineHeader);
  const linesDirty = isEdit && baselineLines !== null && JSON.stringify(lineItems) !== JSON.stringify(baselineLines);
  const dirty = headerDirty || linesDirty;
  const dirtyKey = `${headerDirty}|${linesDirty}|${JSON.stringify(headerPatch)}|${JSON.stringify(lineItems)}`;

  // ── edit mode: persist (header PATCH + line diff sync), serialized ────────
  const persistingRef = useRef(false);
  const rerunRef = useRef(false);
  const persist = async (): Promise<Invoice | null> => {
    if (!invoice) return null;
    if (persistingRef.current) {
      rerunRef.current = true;
      return null;
    }
    persistingRef.current = true;
    setSaving(true);
    try {
      let current = invoice;
      if (headerDirty) {
        current = await updateInvoiceHeader(invoice.id, headerPatch);
        setInvoice(current);
        setBaselineHeader({ ...headerPatch });
      }
      if (linesDirty) {
        const synced = await syncLineItems(invoice.id, lineItems, baselineLines ?? []);
        setLineItems(synced);
        setBaselineLines(synced);
        current = await getInvoice(invoice.id);
        setInvoice(current);
      }
      setSavedAt(new Date());
      setFormError(null);
      return current;
    } catch (error) {
      setFormError({
        message: error instanceof Error ? error.message : "Failed to save changes.",
        fields: (error as { fields?: Record<string, string[]> }).fields,
      });
      if (persistingRef.current) addToast("error", "Autosave failed — see the error on the page.");
      return null;
    } finally {
      persistingRef.current = false;
      setSaving(false);
      if (rerunRef.current) {
        rerunRef.current = false;
        void persist();
      }
    }
  };
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Debounced autosave: fires 1.5s after the last edit-mode change.
  useEffect(() => {
    if (!isEdit || !dirty) return;
    const timer = setTimeout(() => void persistRef.current(), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyKey, isEdit, dirty]);

  // ── line-item generation (server-authoritative preview) ───────────────────
  const generate = async (opts?: { warnIfDirty?: boolean }): Promise<boolean> => {
    if (!clientId || !periodStart || !periodEnd) {
      addToast("warning", "Pick a client and billing period first.");
      return false;
    }
    if (opts?.warnIfDirty && (lineItems.length > 0 || sourceIds.length > 0)) {
      // Caller confirms by clicking again; we just replace deterministically.
    }
    setPreviewing(true);
    try {
      const preview = await previewLineItems(clientId, periodStart, periodEnd);
      setLineItems(preview.lineItems);
      setSourceIds(preview.timesheetIds);
      addToast("success", `${preview.lineItems.length} line items generated from approved timesheets`);
      return true;
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Could not generate line items.");
      return false;
    } finally {
      setPreviewing(false);
    }
  };

  // Auto-generate when a period is first picked and the list is still empty.
  const autoGenKey = `${clientId}|${period}`;
  const autoGenDoneRef = useRef("");
  useEffect(() => {
    if (isEdit || !period) return;
    if (autoGenDoneRef.current === autoGenKey || lineItems.length > 0) return;
    autoGenDoneRef.current = autoGenKey;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenKey, isEdit, lineItems.length]);

  // ── create / send ─────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!clientId) return "Select a client.";
    if (lineItems.length === 0) return "Add at least one line item (or generate from timesheets).";
    if (!issueDate || !dueDate) return "Issue date and due date are required.";
    return null;
  };

  const handleCreate = async (sendAfter: boolean): Promise<void> => {
    const problem = validate();
    if (problem) {
      setFormError({ message: problem });
      return;
    }
    if (sendAfter && !canSend) {
      setFormError({ message: "You do not have permission to send invoices." });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createInvoice({
        clientId,
        poNumber: poNumber || undefined,
        subject,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        issueDate,
        dueDate,
        currency,
        paymentTerms,
        taxRate,
        notes: notes || undefined,
        termsAndConditions: terms || undefined,
        templateId: templateId || undefined,
        lineItems,
        timesheetIds: sourceIds,
      });
      if (sendAfter) {
        setEmailFor(created);
      } else {
        addToast("success", `Invoice ${created.invoiceNumber} created as a draft.`);
        navigate(ROUTES.INVOICE_DETAIL.replace(":invoiceId", created.id), { replace: true });
      }
    } catch (error) {
      setFormError({
        message: error instanceof Error ? error.message : "Failed to create the invoice.",
        fields: (error as { fields?: Record<string, string[]> }).fields,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (sendAfter: boolean): Promise<void> => {
    if (!isEdit) {
      await handleCreate(sendAfter);
      return;
    }
    const saved = await persist();
    if (saved && sendAfter) setEmailFor(saved);
    else if (saved && !sendAfter) addToast("success", "Draft saved.");
    else if (!saved) addToast("error", "Could not save changes — see the error on the page.");
  };

  // ── line-item editing ─────────────────────────────────────────────────────
  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        if (patch.quantity !== undefined || patch.rate !== undefined) {
          next.amount = Number((next.quantity * next.rate).toFixed(2));
        }
        return next;
      })
    );
  };
  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: tempLineId(), description: "", quantity: 1, rate: 0, amount: 0, manual: true, sortOrder: prev.length },
    ]);
  };
  const removeLine = (id: string) => setLineItems((prev) => prev.filter((li) => li.id !== id));
  const moveLine = (index: number, dir: -1 | 1) => {
    setLineItems((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved);
      return next.map((li, i) => ({ ...li, sortOrder: i }));
    });
  };

  const dueDateTouchedRef = useRef(false);
  const termsTouchedRef = useRef(false);
  const taxTouchedRef = useRef(false);
  const clientLocked = isEdit;
  const periodLocked = isEdit;
  const duplicate = isEdit ? overlaps.find((o) => o.id !== invoice?.id) : overlaps[0];
  const saveStateLabel = isEdit
    ? saving
      ? "Saving…"
      : dirty
        ? "Unsaved changes"
        : savedAt
          ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "No changes"
    : "Draft — not saved yet";

  const periodOptionLabel = (start: string, end: string): string => {
    const opt = periodOptions.find((o) => o.start === start && o.end === end);
    const base = `${formatInvoiceDate(start)} – ${formatInvoiceDate(end)}`;
    if (!opt) return base;
    const plural = opt.timesheetCount === 1 ? "timesheet" : "timesheets";
    return `${base} · ${opt.timesheetCount} approved ${plural} · ${formatCurrency(opt.billableAmount, currency)}`;
  };

  // ── send-after-create: email modal + real PDF download ────────────────────
  const clientEmail = useMemo(() => client?.primaryContact?.email ?? "", [client]);
  const handleEmailSend = async (invoiceId: string, email: { to: string; subject: string; body: string }): Promise<void> => {
    try {
      const sent = await sendInvoice(invoiceId, email.to || undefined);
      setEmailFor(null);
      addToast("success", `Invoice ${sent.invoiceNumber} sent to ${email.to || clientEmail || "client"}.`);
      navigate(ROUTES.INVOICE_DETAIL.replace(":invoiceId", sent.id));
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to send the invoice.");
    }
  };
  if (loading) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Loading draft…</p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={isEdit ? `Edit #${invoice?.invoiceNumber ?? invoiceId}` : "New Invoice"}
        subtitle={
          isEdit
            ? `${invoice?.clientName ?? ""} — draft, changes autosave`
            : "One screen: client, period, line items, send"
        }
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500" data-testid="save-state">
              {saveStateLabel}
            </span>
            <button className="btn btn-secondary" onClick={() => navigate(ROUTES.INVOICES)}>
              <ArrowLeft size={16} className="mr-2" />Back
            </button>
            {(isEdit ? canEdit : canCreate) && (
              <button className="btn btn-secondary" disabled={saving} onClick={() => void handleSave(false)}>
                <Save size={16} className="mr-2" />
                {isEdit ? "Save" : "Save Draft"}
              </button>
            )}
            {canSend && (
              <button className="btn btn-primary" disabled={saving} onClick={() => void handleSave(true)}>
                <Send size={16} className="mr-2" />
                {isEdit ? "Save & Send" : "Create & Send"}
              </button>
            )}
          </div>
        }
      />

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">{formError.message}</p>
          {formError.fields &&
            Object.entries(formError.fields).map(([field, messages]) => (
              <p key={field} className="mt-1">
                {field}: {messages.join(", ")}
              </p>
            ))}
        </div>
      )}

      {duplicate && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            An open invoice already covers this period:{" "}
            <button
              className="font-medium underline"
              onClick={() => navigate(ROUTES.INVOICE_DETAIL.replace(":invoiceId", duplicate.id))}
            >
              {duplicate.invoiceNumber}
            </button>{" "}
            ({duplicate.status}). You can still create this one, but check you are not billing twice.
          </p>
        </div>
      )}

      {/* ── main grid: form + sticky summary rail ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Setup card */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Client &amp; Period</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Client *</label>
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={clientLocked}>
                  <option value="">Select a client…</option>
                  {clients
                    .filter((c) => c.status === "ACTIVE")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.clientCode})
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <label className="form-label">Billing Period</label>
                <Select
                  value={periodChoice}
                  onChange={(e) => setPeriodChoice(e.target.value)}
                  disabled={periodLocked || !clientId}
                >
                  <option value="">
                    {clientId
                      ? periodOptions.length > 0
                        ? "Select a period…"
                        : "No approved timesheets for this client"
                      : "Pick a client first…"}
                  </option>
                  {periodOptions.map((o) => (
                    <option key={`${o.start}|${o.end}`} value={`${o.start}|${o.end}`}>
                      {periodOptionLabel(o.start, o.end)}
                    </option>
                  ))}
                  {periodOptions.length === 0 && clientId && <option value="none">No billable work (manual invoice)</option>}
                  <option value="custom">Custom range…</option>
                </Select>
              </div>
              {periodChoice === "custom" && !periodLocked && (
                <>
                  <div>
                    <label className="form-label">Period Start</label>
                    <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Period End</label>
                    <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            {client && (
              <p className="mt-3 text-xs text-gray-500">
                {client.name} · {client.paymentTerms.replace(/_/g, " ")} ·{" "}
                {client.billingAddress
                  ? [client.billingAddress.line1, client.billingAddress.city, client.billingAddress.country]
                      .filter(Boolean)
                      .join(", ")
                  : "no billing address on file"}
              </p>
            )}
          </section>

          {/* Details card */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="form-label">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Professional Consulting" />
              </div>
              <div>
                <label className="form-label">PO Number</label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="form-label">Currency</label>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value as Invoice["currency"])}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="form-label">Issue Date</label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    if (!dueDateTouchedRef.current) setDueDate(dueDateFromTerms(e.target.value, paymentTerms));
                  }}
                />
              </div>
              <div>
                <label className="form-label">Payment Terms</label>
                <Select
                  value={paymentTerms}
                  onChange={(e) => {
                    const next = e.target.value as Invoice["paymentTerms"];
                    setPaymentTerms(next);
                    if (!dueDateTouchedRef.current) setDueDate(dueDateFromTerms(issueDate, next));
                  }}
                >
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    dueDateTouchedRef.current = true;
                    setDueDate(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="form-label">Tax Rate (decimal, e.g. 0.18)</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={taxRate}
                  onChange={(e) => {
                    taxTouchedRef.current = true;
                    setTaxRate(Number(e.target.value) || 0);
                  }}
                />
              </div>
              <div>
                <label className="form-label">Template (PDF branding)</label>
                <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  <option value="">Default template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Terms &amp; Conditions</label>
                <Textarea
                  value={terms}
                  onChange={(e) => {
                    termsTouchedRef.current = true;
                    setTerms(e.target.value);
                  }}
                  rows={2}
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* Line items card */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Line Items{lineItems.length > 0 ? ` (${lineItems.length})` : ""}
              </h2>
              <div className="flex items-center gap-2">
                {sourceIds.length > 0 && (
                  <span className="text-xs text-gray-500">{sourceIds.length} source timesheets</span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary px-3 py-1.5 text-xs"
                  disabled={previewing || !clientId || !periodStart || !periodEnd}
                  onClick={() => void generate({ warnIfDirty: true })}
                  title={
                    clientId && periodStart && periodEnd
                      ? "Regenerate from approved timesheets (replaces current rows)"
                      : "Pick a client and billing period first"
                  }
                >
                  <RefreshCw size={14} className={`mr-1 ${previewing ? "animate-spin" : ""}`} />
                  {previewing ? "Generating…" : lineItems.length > 0 ? "Regenerate" : "Generate"}
                </button>
                <button type="button" className="btn btn-secondary px-3 py-1.5 text-xs" onClick={addLine}>
                  <Plus size={14} className="mr-1" />Add row
                </button>
              </div>
</div>



          </section>

          {/* Summary rail: totals + invoice-detail table */}
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
                {lineItems.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => generate({ warnIfDirty: true })}
                  >
                    <RefreshCw size={14} className="mr-1" />Regenerate
                  </button>
                )}
              </div>

              {lineItems.length === 0 ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No line items yet. Generate from approved timesheets or add a row manually.
                </div>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                          <th className="text-left py-2 pr-2 font-medium">Description</th>
                          <th className="text-right py-2 pr-2 font-medium">Qty</th>
                          <th className="text-right py-2 pr-2 font-medium">Rate</th>
                          <th className="text-right py-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li, i) => (
                          <tr key={li.id} className="border-b border-gray-100">
                            <td className="py-2 pr-2">{li.description || <span className="text-gray-400">(untitled row)</span>}</td>
                            <td className="py-2 pr-2 text-right">{li.quantity.toFixed(li.quantity % 1 === 0 ? 0 : 2)}</td>
                            <td className="py-2 pr-2 text-right">{li.rate.toLocaleString(currency)}</td>
                            <td className="py-2 text-right font-medium">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(li.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td colSpan={3} className="py-2 text-right text-xs text-gray-500">Subtotal</td>
                          <td className="py-2 text-right text-sm font-medium">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(subtotal)}</td>
                        </tr>
                        {taxRate > 0 && (
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <td colSpan={3} className="py-2 text-right text-xs text-gray-500">Tax ({Math.round(taxRate * 100)}%)</td>
                            <td className="py-2 text-right text-sm">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(taxAmount)}</td>
                          </tr>
                        )}
                        <tr className="border-b border-gray-200 bg-gray-100 font-semibold">
                          <td colSpan={3} className="py-2 text-right">Total</td>
                          <td className="py-2 text-right">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(totalAmount)}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={3} className="py-2 text-right text-gray-500">Balance due</td>
                          <td className="py-2 text-right text-sm font-semibold">{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(balanceDue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </section>


            {/* Send-by-email modal */}
            {emailFor && (
              <InvoiceEmailModal
                open={!!emailFor}
                invoice={emailFor ?? invoice}
                clientEmail={clientEmail}
                onClose={() => setEmailFor(null)}
                onSend={handleEmailSend}
              />
            )}
          </div>
        </div>
    </div>
  );
}
