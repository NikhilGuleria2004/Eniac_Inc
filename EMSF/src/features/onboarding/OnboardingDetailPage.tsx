import { NavLink, useParams, Navigate } from "react-router-dom";
import { Check, Circle, Lock, Pencil, Mail, MailCheck, Save } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { getDocuments, getEmployeeById, sendOnboardingInvite, updateOnboardingBilling } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { Progress } from "../../components/ui/Progress";
import { StatusBadge } from "../../components/data/StatusBadge";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { type BillingStatus } from "../../types";
import { getOnboardingProgress, getOnboardingStage, getOnboardingStepData, getOnboardingTargetDate } from "./onboarding";

type InviteState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; email: string; workMail?: string; emailSent: boolean }
  | { status: "error"; message: string };

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  ONBOARDING_NOT_COMPLETED: "Onboarding must be completed before sending an invitation.",
  INVITATION_ALREADY_PENDING: "An invitation is already pending for this employee.",
  USER_ALREADY_ACTIVE: "This employee already has an active account.",
  NOT_FOUND: "Employee was not found."
};

export function OnboardingDetailPage() {
  const { employeeId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const [inviteState, setInviteState] = useState<InviteState>({ status: "idle" });
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingSaving, setBillingSaving] = useState(false);
  if (!hasPermission(role, "onboarding.manage")) return <Navigate to="/403" replace />;
  const employee = employeeId ? getEmployeeById(employeeId) : undefined;
  if (!employee) return (<div className="page-container"><div className="card"><h1 className="text-lg font-semibold text-gray-900">Onboarding record not found</h1><NavLink to={ROUTES.ONBOARDING} className="btn btn-secondary text-sm mt-4">Back to Onboarding</NavLink></div></div>);
  const documents = getDocuments();
  const steps = getOnboardingStepData(employee, documents);
  const progress = getOnboardingProgress(steps);
  const stage = getOnboardingStage(steps);
  const target = getOnboardingTargetDate(employee);
  const canEdit = hasPermission(role, "employee.edit");
  const canManageOnboarding = hasPermission(role, "onboarding.manage");
  const name = employee.firstName + " " + employee.lastName;

  const handleBillingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBillingStatus(e.target.value as BillingStatus);
  };

  const handleBillingSave = async () => {
    if (!billingStatus || !employee) return;
    setBillingSaving(true);
    try {
      await updateOnboardingBilling(employee.id, billingStatus);
      setBillingStatus(null);
    } catch {
      setBillingStatus(null);
    } finally {
      setBillingSaving(false);
    }
  };

  const handleSendInvite = async () => {
    setInviteState({ status: "sending" });
    try {
       const result = await sendOnboardingInvite(employee.id);
       setInviteState({ status: "sent", email: result.email, workMail: result.workMail, emailSent: result.emailSent });
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
      setInviteState({
        status: "error",
        message: INVITE_ERROR_MESSAGES[code] ?? "Failed to send the invitation. Please try again."
      });
    }
  };

  const canInvite = stage === "Completed" && inviteState.status !== "sending";

  return (
    <div className="page-container space-y-6">
      <PageHeader title={name} description={"Onboarding workflow — " + employee.employeeCode}
        breadcrumbs={[{ label: "Onboarding", href: ROUTES.ONBOARDING }, { label: name }]}
        actions={(
          <>
            {canEdit && (<NavLink to={ROUTES.EMPLOYEE_EDIT(employee.id)} className="btn btn-secondary text-sm"><Pencil aria-hidden="true" size={16} /> Edit Employee</NavLink>)}
            {canInvite && (
              <button type="button" onClick={handleSendInvite} className="btn btn-primary text-sm">
                <Mail aria-hidden="true" size={16} /> Send Invite
              </button>
            )}
          </>
        )} />
      {inviteState.status === "sent" && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <MailCheck aria-hidden="true" size={16} className="mt-0.5 flex-shrink-0" />
           <span>
             Invitation sent to <span className="font-medium">{inviteState.email ?? inviteState.workMail ?? "the employee"}</span>.
             {!inviteState.emailSent && " The email could not be delivered — check the server log for the invite link."}
           </span>
        </div>
      )}
      {inviteState.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {inviteState.message}
        </div>
      )}
      <div className="card"><div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <EmployeeAvatar firstName={employee.firstName} lastName={employee.lastName} avatar={employee.avatar} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-gray-900">{name}</h2><StatusBadge status={employee.employmentStatus} /><StatusBadge status={employee.billingStatus} /></div>
          <p className="text-sm text-gray-500 mt-1">Current stage: <span className="font-medium text-gray-900">{stage}</span> | Target: {target}</p>
          <div className="mt-3 max-w-md"><Progress value={progress} showLabel /></div>
        </div>
      </div></div>
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Onboarding Steps (8)</h3>
        <ol className="space-y-0">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={"w-8 h-8 rounded-full flex items-center justify-center " + (s.status === "complete" ? "bg-green-600 text-white" : s.status === "current" ? "bg-accent text-white" : "bg-gray-100 text-gray-400")}>
                  {s.status === "complete" ? <Check aria-hidden="true" size={16} /> : s.status === "current" ? <Circle aria-hidden="true" size={16} /> : <Lock aria-hidden="true" size={14} />}
                </div>
                {i < steps.length - 1 && <div className={"w-0.5 flex-1 min-h-6 " + (s.status === "complete" ? "bg-green-200" : "bg-gray-100")} />}
              </div>
              <div className="pb-6 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{i + 1}. {s.label}</p>
                  <span className={"badge " + (s.status === "complete" ? "badge-success" : s.status === "current" ? "badge-info" : "badge-neutral")}>{s.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{s.detail}</p>
                {s.label === "Geography" && (
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span className="font-medium">Country:</span> {employee.country} | <span className="font-medium">City:</span> {employee.city} | <span className="font-medium">State:</span> {employee.state ?? "—"}
                  </div>
                )}
                {s.label === "Billing Classification" && canManageOnboarding && (
                  <div className="mt-2 flex items-end gap-2">
                    <select
                      className="form-input text-sm"
                      value={billingStatus ?? employee.billingStatus}
                      onChange={handleBillingChange}
                      disabled={billingSaving}
                    >
                      <option value="BILLABLE">BILLABLE</option>
                      <option value="NON_BILLABLE">NON-BILLABLE</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleBillingSave}
                      disabled={!billingStatus || billingSaving || billingStatus === employee.billingStatus}
                      className="btn btn-primary text-sm"
                    >
                      <Save aria-hidden="true" size={14} /> {billingSaving ? "Saving…" : "Save"}
                    </button>
                    <span className="text-xs text-gray-500">
                      {employee.timesheetEligibility === "ELIGIBLE"
                        ? "ACTIVE + BILLABLE → TIMESHEET ELIGIBLE"
                        : "Not eligible — will provision on activation if BILLABLE"}
                    </span>
                  </div>
                )}
                {s.label === "Billing Classification" && !canManageOnboarding && (
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    {employee.billingStatus === "BILLABLE"
                      ? "BILLABLE — eligible for timesheet provisioning on activation"
                      : "NON-BILLABLE — not auto-provisioned to timesheet platform"}
                  </div>
                )}
                {s.label === "Timesheet Eligibility" && (
                  <div className="mt-2 text-xs text-gray-600">
                    Provisioning state: <StatusBadge status={employee.timesheetEligibility} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
