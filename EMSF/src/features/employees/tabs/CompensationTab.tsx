import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import { getCompensation, saveCompensation } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";

type PayFrequency = "MONTHLY" | "YEARLY" | "HOURLY";
type BillUnit = "HOURLY" | "DAILY" | "MONTHLY";

const CURRENCIES = ["INR", "USD"];
const PAY_FREQUENCIES: PayFrequency[] = ["MONTHLY", "YEARLY", "HOURLY"];
const BILL_UNITS: BillUnit[] = ["HOURLY", "DAILY", "MONTHLY"];

export function CompensationTab({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canView = hasPermission(role, "compensation.view");
  const canManage = hasPermission(role, "compensation.manage");

  const [compensation, setCompensation] = useState<{
    salary: { currency: string; amount: number; payFrequency: string } | null;
    billRate: { currency: string; amount: number; unit: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currency, setCurrency] = useState("INR");
  const [salary, setSalary] = useState("");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("MONTHLY");
  const [billCurrency, setBillCurrency] = useState("INR");
  const [billAmount, setBillAmount] = useState("");
  const [billUnit, setBillUnit] = useState<BillUnit>("HOURLY");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompensation(employee.id);
        if (cancelled) return;
        setCompensation(data);
        if (data.salary) {
          setCurrency(data.salary.currency);
          setSalary(String(data.salary.amount));
          setPayFrequency(data.salary.payFrequency as PayFrequency);
        }
        if (data.billRate) {
          setBillCurrency(data.billRate.currency);
          setBillAmount(String(data.billRate.amount));
          setBillUnit(data.billRate.unit as BillUnit);
        }
      } catch {
        if (!cancelled) setError("Could not load compensation details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  if (!canView) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Compensation</h3>
        <p className="text-sm text-gray-500">
          Restricted. Only ADMIN and HR can view compensation details.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: {
      salary?: { currency: string; amount: number; payFrequency: PayFrequency };
      billRate?: { currency: string; amount: number; unit: BillUnit };
    } = {};

    if (salary) {
      const amount = Number(salary);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid pay rate.");
        return;
      }
      payload.salary = { currency, amount, payFrequency };
    }
    if (billAmount) {
      const amount = Number(billAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid bill rate.");
        return;
      }
      payload.billRate = { currency: billCurrency, amount, unit: billUnit };
    }

    if (!payload.salary && !payload.billRate) {
      setError("Enter a pay rate or a bill rate (or both).");
      return;
    }

    setSaving(true);
    try {
      const updated = await saveCompensation(employee.id, payload);
      setCompensation(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save compensation.");
    } finally {
      setSaving(false);
    }
  };

  const input = "form-input";
  const label = "form-label";

  return (
    <div className="card min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Compensation</h3>
          <p className="text-xs text-gray-500">Employee cost and client bill rate.</p>
        </div>
        {canManage && !editing && !loading && (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary text-sm">
            <Pencil aria-hidden="true" size={14} /> {compensation?.salary || compensation?.billRate ? "Edit" : "Set rates"}
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading compensation…</p>}
      {error && !editing && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
      )}

      {!loading && !editing && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="border border-gray-100 rounded-md p-3">
            <dt className="text-xs text-gray-500">Pay Rate</dt>
            <dd className="text-gray-900 font-medium mt-1">
              {compensation?.salary
                ? `${compensation.salary.currency} ${compensation.salary.amount.toLocaleString()} / ${compensation.salary.payFrequency.toLowerCase()}`
                : "— not set"}
            </dd>
          </div>
          <div className="border border-gray-100 rounded-md p-3">
            <dt className="text-xs text-gray-500">Bill Rate</dt>
            <dd className="text-gray-900 font-medium mt-1">
              {compensation?.billRate
                ? `${compensation.billRate.currency} ${compensation.billRate.amount.toLocaleString()} / ${compensation.billRate.unit.toLowerCase()}`
                : "— not set"}
            </dd>
          </div>
          <div className="border border-gray-100 rounded-md p-3">
            <dt className="text-xs text-gray-500">Billing Status</dt>
            <dd className="mt-1"><StatusBadge status={employee.billingStatus} /></dd>
          </div>
          <div className="border border-gray-100 rounded-md p-3">
            <dt className="text-xs text-gray-500">Employment Type</dt>
            <dd className="text-gray-900 font-medium mt-1">{employee.employmentType.replace(/_/g, " ")}</dd>
          </div>
        </dl>
      )}

      {editing && (
        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Pay Rate (employee cost)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={label} htmlFor="currency-1">Currency</label><select id="currency-1" className={input} value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={label} htmlFor="amount-1">Amount</label><input id="amount-1" type="number" min="0" step="0.01" className={input} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 85000" /></div>
            <div><label className={label} htmlFor="frequency">Frequency</label><select id="frequency" className={input} value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}>{PAY_FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}</select></div>
          </div>

          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider pt-2">Bill Rate (client)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={label} htmlFor="currency">Currency</label><select id="currency" className={input} value={billCurrency} onChange={(e) => setBillCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={label} htmlFor="amount">Amount</label><input id="amount" type="number" min="0" step="0.01" className={input} value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="e.g. 120000" /></div>
            <div><label className={label} htmlFor="unit">Unit</label><select id="unit" className={input} value={billUnit} onChange={(e) => setBillUnit(e.target.value as BillUnit)}>{BILL_UNITS.map((u) => <option key={u} value={u}>{u.replace(/_/g, " ")}</option>)}</select></div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button type="button" className="btn btn-secondary text-sm" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary text-sm">{saving ? "Saving…" : "Save Compensation"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
