import { useState } from "react";
import { Save } from "lucide-react";
import type { Employee, BillingStatus, EmploymentType } from "../../../types";
import {
  getEmployees,
  updateEmployee,
  updateOnboardingBilling,
} from "../../../data/mock/repositories";
import {
  COUNTRIES,
  CITIES,
  INDIAN_STATES,
  US_STATES,
  DESIGNATIONS,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
} from "../../../data/constants";
import { Button } from "../../../components/ui/Button";

interface StepEditorProps {
  employee: Employee;
  onSaved: () => void;
}

interface StepErrorProps {
  error: string;
}

function StepError({ error }: StepErrorProps) {
  if (!error) return null;
  return (
    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </div>
  );
}

export function Step1EmployeeInfo({ employee, onSaved }: StepEditorProps) {
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    setError("");
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    setSaving(true);
    try {
      updateEmployee(employee.id, { phone: phone.trim() });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-accent hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      <div>
        <label className="form-label">Full Name</label>
        <input
          className="form-input"
          value={`${employee.firstName} ${employee.lastName}`}
          readOnly
        />
      </div>
      <div>
        <label className="form-label">Email</label>
        <input className="form-input" value={employee.email} readOnly />
      </div>
      {editing ? (
        <div>
          <label className="form-label">Phone *</label>
          <input
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555-000-0000"
          />
        </div>
      ) : (
        <div>
          <label className="form-label">Phone</label>
          <input className="form-input" value={employee.phone ?? "—"} readOnly />
        </div>
      )}

      <StepError error={error} />

      {editing && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPhone(employee.phone ?? "");
              setEditing(false);
              setError("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            window.open(`/employees/${employee.id}/edit?return=/onboarding/${employee.id}`, "_blank");
          }}
          className="text-xs text-accent hover:underline"
        >
          Edit full profile (opens in new tab)
        </button>
      </div>
    </div>
  );
}

export function Step2EmploymentDetails({ employee, onSaved }: StepEditorProps) {
  const [designation, setDesignation] = useState(employee.designation);
  const [department, setDepartment] = useState(employee.department);
  const [employmentType, setEmploymentType] = useState(employee.employmentType);
  const [joiningDate, setJoiningDate] = useState(employee.joiningDate);
  const [managerId, setManagerId] = useState(employee.managerId ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const managers = getEmployees().filter((e) => e.role === "MANAGER");

  const handleSave = () => {
    setError("");
    if (!designation || !department) {
      setError("Designation and department are required.");
      return;
    }
    setSaving(true);
    try {
      updateEmployee(employee.id, {
        designation,
        department,
        employmentType,
        joiningDate,
        managerId: managerId || undefined,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!editing ? (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Designation:</span>{" "}
            <span className="text-gray-900">{employee.designation}</span>
          </div>
          <div>
            <span className="text-gray-500">Department:</span>{" "}
            <span className="text-gray-900">{employee.department}</span>
          </div>
          <div>
            <span className="text-gray-500">Employment Type:</span>{" "}
            <span className="text-gray-900">{employee.employmentType.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-gray-500">Joining Date:</span>{" "}
            <span className="text-gray-900">{employee.joiningDate}</span>
          </div>
          <div>
            <span className="text-gray-500">Manager:</span>{" "}
            <span className="text-gray-900">
              {employee.managerId
                ? (() => {
                    const mgr = getEmployees().find((e) => e.id === employee.managerId);
                    return mgr ? `${mgr.firstName} ${mgr.lastName}` : employee.managerId;
                  })()
                : "—"}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Designation *</label>
            <select
              className="form-input"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            >
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Department *</label>
            <select
              className="form-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Employment Type *</label>
            <select
              className="form-input"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Manager</label>
            <select
              className="form-input"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">— None —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.designation})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Joining Date *</label>
            <input
              type="date"
              className="form-input"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </div>
        </div>
      )}

      <StepError error={error} />

      {editing && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDesignation(employee.designation);
              setDepartment(employee.department);
              setEmploymentType(employee.employmentType);
              setJoiningDate(employee.joiningDate);
              setManagerId(employee.managerId ?? "");
              setEditing(false);
              setError("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function Step3Geography({ employee, onSaved }: StepEditorProps) {
  const [country, setCountry] = useState<"India" | "United States">(employee.country);
  const [city, setCity] = useState(employee.city ?? CITIES[employee.country][0]);
  const [state, setState] = useState(employee.state ?? "");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [_postalCode, setPostalCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cities = CITIES[country];
  const states = country === "India" ? INDIAN_STATES : US_STATES;

  const handleSave = () => {
    setError("");
    if (!country || !city) {
      setError("Country and city are required.");
      return;
    }
    setSaving(true);
    try {
      updateEmployee(employee.id, {
        country,
        city,
        state: state || undefined,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!editing ? (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Country:</span>{" "}
            <span className="text-gray-900">{employee.country}</span>
          </div>
          <div>
            <span className="text-gray-500">City:</span>{" "}
            <span className="text-gray-900">{employee.city ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">State:</span>{" "}
            <span className="text-gray-900">{employee.state ?? "—"}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-2">
            {COUNTRIES.map((c) => (
              <label key={c} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="country"
                  checked={country === c}
                  onChange={() => setCountry(c)}
                />
                {c}
              </label>
            ))}
          </div>
          <div>
            <label className="form-label">City *</label>
            <select
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">State</label>
            <select
              className="form-input"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">— Select —</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Address Line 1</label>
            <input
              className="form-input"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className="form-label">Address Line 2</label>
            <input
              className="form-input"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apt, suite, etc."
            />
          </div>
          <div>
            <label className="form-label">Postal Code</label>
            <input
              className="form-input"
              value={_postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="12345"
            />
          </div>
        </div>
      )}

      <StepError error={error} />

      {editing && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setCountry(employee.country);
              setCity(employee.city ?? CITIES[employee.country][0]);
              setState(employee.state ?? "");
              setEditing(false);
              setError("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function Step4BillingClassification({ employee, onSaved }: StepEditorProps) {
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(employee.billingStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await updateOnboardingBilling(employee.id, billingStatus);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="billingStatus"
            checked={billingStatus === "BILLABLE"}
            onChange={() => setBillingStatus("BILLABLE")}
            className="mt-1"
          />
          <div>
            <p className="font-medium text-gray-900">BILLABLE</p>
            <p className="text-sm text-gray-500">
              Eligible for timesheet platform provisioning on activation.
              Will be billed to clients.
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="billingStatus"
            checked={billingStatus === "NON_BILLABLE"}
            onChange={() => setBillingStatus("NON_BILLABLE")}
            className="mt-1"
          />
          <div>
            <p className="font-medium text-gray-900">NON-BILLABLE</p>
            <p className="text-sm text-gray-500">
              Tracked locally only. No automatic timesheet provisioning.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        {billingStatus === "BILLABLE"
          ? "✅ BILLABLE — timesheet platform provisioning will trigger on activation."
          : "ℹ️ NON-BILLABLE — no timesheet platform provisioning will occur."}
      </div>

      <StepError error={error} />

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Saving..." : "Save Billing"}
        </Button>
      </div>

      {billingStatus === "BILLABLE" && (
        <div className="text-xs text-gray-500">
          Timesheet eligibility after activation:{" "}
          <span className="font-medium text-green-700">ELIGIBLE</span>
        </div>
      )}
      {billingStatus === "NON_BILLABLE" && (
        <div className="text-xs text-gray-500">
          Timesheet eligibility after activation:{" "}
          <span className="font-medium text-gray-500">NOT ELIGIBLE</span>
        </div>
      )}
    </div>
  );
}
