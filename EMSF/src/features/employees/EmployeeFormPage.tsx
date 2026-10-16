import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { BillingStatus, Employee, EmploymentStatus, EmploymentType, Role } from "../../types";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { createEmployee, createOnboardingRecord, getEmployeeById, getEmployees, sendOnboardingInvite, updateEmployee } from "../../data/mock/repositories";
import { CITIES, COUNTRIES, DEPARTMENTS, DESIGNATIONS, EMPLOYMENT_TYPES, ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { Navigate } from "react-router-dom";
const STATUSES: EmploymentStatus[] = ["ACTIVE","ONBOARDING","ON_LEAVE","SUSPENDED","RESIGNED","TERMINATED","INACTIVE"];
export function EmployeeFormPage() {
  const { employeeId } = useParams();
  const isNew = !employeeId || employeeId === "new";
  const existing = !isNew && employeeId ? getEmployeeById(employeeId) : undefined;
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "EMPLOYEE";
  const perm = isNew ? "employee.create" : "employee.edit";
  if (!hasPermission(role, perm as "employee.create")) return <Navigate to="/403" replace />;
  if (!isNew && !existing) return <div className="page-container"><div className="card">Employee not found.</div></div>;
  return <EmployeeForm key={existing?.id ?? "new"} existing={existing} isNew={isNew} navigate={navigate} />;
}
function EmployeeForm({ existing, isNew, navigate }: { existing?: Employee; isNew: boolean; navigate: (to: string) => void }) {
  const [firstName, setFirstName] = useState(existing?.firstName ?? "");
  const [lastName, setLastName] = useState(existing?.lastName ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [workMail, setWorkMail] = useState(existing?.workMail ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [designation, setDesignation] = useState(existing?.designation ?? DESIGNATIONS[0]);
  const [department, setDepartment] = useState(existing?.department ?? DEPARTMENTS[0]);
  const [country, setCountry] = useState<"India" | "United States">(existing?.country ?? "India");
  const [city, setCity] = useState(existing?.city ?? CITIES["India"][0]);
  const [status, setStatus] = useState<EmploymentStatus>(existing?.employmentStatus ?? "ONBOARDING");
  const [empType, setEmpType] = useState<EmploymentType>(existing?.employmentType ?? "FULL_TIME");
  const [billing, setBilling] = useState<BillingStatus>(existing?.billingStatus ?? "NON_BILLABLE");
  const [joiningDate, setJoiningDate] = useState(existing?.joiningDate ?? new Date().toISOString().split("T")[0]);
  const [roleField, setRoleField] = useState<Role>(existing?.role ?? "EMPLOYEE");
  const [currency, setCurrency] = useState<"INR" | "USD">(existing?.country === "United States" ? "USD" : "INR");
  const [payRate, setPayRate] = useState(existing?.compensation?.salary?.toString() ?? existing?.salary?.toString() ?? "");
  const [payFrequency, setPayFrequency] = useState<"MONTHLY" | "YEARLY" | "HOURLY">((existing?.compensation?.payFrequency as "MONTHLY" | "YEARLY" | "HOURLY" | undefined) ?? "MONTHLY");
  const [billCurrency, setBillCurrency] = useState<"INR" | "USD">((existing?.billRate?.currency as "INR" | "USD" | undefined) ?? (existing?.country === "United States" ? "USD" : "INR"));
  const [billAmount, setBillAmount] = useState(existing?.billRate?.amount?.toString() ?? existing?.hourlyRate?.toString() ?? "");
  const [billUnit, setBillUnit] = useState<"HOURLY" | "DAILY" | "MONTHLY">((existing?.billRate?.unit as "HOURLY" | "DAILY" | "MONTHLY" | undefined) ?? "HOURLY");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const cities = CITIES[country];
  const eligibility = status === "ACTIVE" && billing === "BILLABLE" ? "ELIGIBLE (provision to Timesheet)" : "NOT ELIGIBLE";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) { setError("First and last name are required."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (workMail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(workMail)) { setError("Enter a valid work email address."); return; }
    if (!phone.trim()) { setError("Phone is required."); return; }
    if (!joiningDate) { setError("Joining date is required."); return; }
    if (payRate && (!/^\d+(\.\d{1,2})?$/.test(payRate) || Number(payRate) <= 0)) { setError("Enter a valid pay rate (a positive number)."); return; }
    if (billing === "BILLABLE" && billAmount && (!/^\d+(\.\d{1,2})?$/.test(billAmount) || Number(billAmount) <= 0)) { setError("Enter a valid bill rate (a positive number)."); return; }
    setSaving(true);
    const code =
      existing?.employeeCode ??
      "EMP-" + (1051 + getEmployees().length + new Date().getMinutes());
    const payload = { employeeCode: code, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), workMail: workMail.trim() || undefined, phone: phone.trim(), designation, department, country, city, employmentStatus: status, employmentType: empType, billingStatus: billing, joiningDate, timesheetEligibility: (status === "ACTIVE" && billing === "BILLABLE" ? "ELIGIBLE" : "NOT_ELIGIBLE") as Employee["timesheetEligibility"], role: roleField,
      compensation: payRate ? { currency, salary: Number(payRate), payFrequency } : undefined,
      billRate: billing === "BILLABLE" && billAmount ? { currency: billCurrency, amount: Number(billAmount), unit: billUnit } : undefined };
    try {
      let saved: Employee | undefined;
      if (isNew) {
        saved = await createEmployee(payload);
        if (saved) {
          try { await createOnboardingRecord(saved.id); } catch {}
          try {
            const inviteResult = await sendOnboardingInvite(saved.id);
            if (!inviteResult.emailSent) {
              setError("Employee created, but the invite email could not be sent. You can resend it from the employee's onboarding page.");
            }
          } catch {
            setError("Employee created, but the invite could not be sent. You can send it from the employee's onboarding page.");
          }
          navigate(ROUTES.EMPLOYEE_DETAIL(saved.id));
        }
      } else if (existing) {
        saved = await updateEmployee(existing.id, payload);
        if (saved) navigate(ROUTES.EMPLOYEE_DETAIL(saved.id));
        else setError("Could not save employee.");
      }
    } catch {
      setError("Could not save employee. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const input = "form-input";
  const label = "form-label";
  return (
    <div className="page-container space-y-6">
      <PageHeader title={isNew ? "Add Employee" : "Edit Employee"} description={isNew ? "Create a new employee record." : "Update employee details."} breadcrumbs={[{ label: "Employees", href: ROUTES.EMPLOYEES }, { label: isNew ? "Add" : (existing ? existing.firstName + " " + existing.lastName : "Edit") }]} />
      <form onSubmit={submit} className="card space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        {isNew && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            New employees are created as <span className="font-medium">ONBOARDING / NON_BILLABLE</span> by design — billing classification happens during onboarding. Pay and bill rates can be set here or updated anytime from the employee profile.
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="first-name">First Name *</label><input id="first-name" className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div><label className={label} htmlFor="last-name">Last Name *</label><input id="last-name" className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
            <div><label className={label} htmlFor="email">Email *</label><input id="email" type="email" spellCheck={false} autoCapitalize="off" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className={label} htmlFor="work-email-workmail">Work Email (workMail)</label><input id="work-email-workmail" type="email" spellCheck={false} autoCapitalize="off" className={input} value={workMail} onChange={(e) => setWorkMail(e.target.value)} placeholder="e.g. john.doe@eniacinc.com" /></div>
            <div><label className={label} htmlFor="phone">Phone *</label><input id="phone" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Employment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="designation">Designation *</label><select id="designation" className={input} value={designation} onChange={(e) => setDesignation(e.target.value)}>{DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className={label} htmlFor="department">Department *</label><select id="department" className={input} value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className={label} htmlFor="employment-type">Employment Type *</label><select id="employment-type" className={input} value={empType} onChange={(e) => setEmpType(e.target.value as EmploymentType)}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className={label} htmlFor="employment-status">Employment Status *</label><select id="employment-status" className={input} value={status} onChange={(e) => setStatus(e.target.value as EmploymentStatus)}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className={label} htmlFor="joining-date">Joining Date *</label><input id="joining-date" type="date" className={input} value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required /></div>
            <div><label className={label} htmlFor="system-role">System Role *</label><select id="system-role" className={input} value={roleField} onChange={(e) => setRoleField(e.target.value as Role)}>{["ADMIN","HR","MANAGER","SUPERVISOR","EMPLOYEE"].map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Geography</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="country">Country *</label><select id="country" className={input} value={country} onChange={(e) => { const c = e.target.value as "India" | "United States"; setCountry(c); setCity(CITIES[c][0]); }}>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={label} htmlFor="city">City *</label><select id="city" className={input} value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Billing Classification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="billing-status">Billing Status *</label><select id="billing-status" className={input} value={billing} onChange={(e) => setBilling(e.target.value as BillingStatus)}><option value="BILLABLE">Billable</option><option value="NON_BILLABLE">Non-Billable</option></select>
            <p className="text-xs text-gray-500 mt-1">ACTIVE + BILLABLE = Timesheet eligible. Non-billable staff are not auto-provisioned.</p></div>
            <div><label className={label} htmlFor="timesheet-eligibility-preview">Timesheet Eligibility (preview)</label><input id="timesheet-eligibility-preview" className={input} value={eligibility} disabled /></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Compensation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="currency-1">Currency *</label><select id="currency-1" className={input} value={currency} onChange={(e) => { setCurrency(e.target.value as "INR" | "USD"); setBillCurrency(e.target.value as "INR" | "USD"); }}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option></select></div>
            <div><label className={label} htmlFor="pay-rate-payfrequency-tolowercase">Pay Rate ({payFrequency.toLowerCase()})</label><input id="pay-rate-payfrequency-tolowercase" type="number" min="0" step="0.01" className={input} value={payRate} onChange={(e) => setPayRate(e.target.value)} placeholder="e.g. 85000" /></div>
            <div><label className={label} htmlFor="pay-frequency">Pay Frequency *</label><select id="pay-frequency" className={input} value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as "MONTHLY" | "YEARLY" | "HOURLY")}>{["MONTHLY", "YEARLY", "HOURLY"].map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}</select></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Employee cost. Leave blank to set it later from the employee profile.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Bill Rate</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="currency">Currency *</label><select id="currency" className={input} value={billCurrency} onChange={(e) => setBillCurrency(e.target.value as "INR" | "USD")} disabled={billing !== "BILLABLE"}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option></select></div>
            <div><label className={label} htmlFor="amount-billunit-tolowercase">Amount ({billUnit.toLowerCase()})</label><input id="amount-billunit-tolowercase" type="number" min="0" step="0.01" className={input} value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="e.g. 120000" disabled={billing !== "BILLABLE"} /></div>
            <div><label className={label} htmlFor="unit">Unit *</label><select id="unit" className={input} value={billUnit} onChange={(e) => setBillUnit(e.target.value as "HOURLY" | "DAILY" | "MONTHLY")} disabled={billing !== "BILLABLE"}>{["HOURLY", "DAILY", "MONTHLY"].map((u) => <option key={u} value={u}>{u.replace(/_/g, " ")}</option>)}</select></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{billing === "BILLABLE" ? "Rate billed to the client. Leave blank to set it later." : "Applies to billable employees only — set Billing Status to Billable above to enter a bill rate."}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link to={ROUTES.EMPLOYEES} className="btn btn-secondary text-sm">Cancel</Link>
          <button type="submit" disabled={saving} className="btn btn-primary text-sm">{saving ? "Saving…" : isNew ? "Send Invite" : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}
