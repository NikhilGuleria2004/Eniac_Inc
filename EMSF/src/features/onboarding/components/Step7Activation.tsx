import { useState } from "react";
import { CheckCircle, Clock, Send, Copy } from "lucide-react";
import type { Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import {
  activateOnboarding,
  sendOnboardingInvite,
} from "../../../data/mock/repositories";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

export interface ActivationResult {
  employeeId: string;
  employmentStatus: string;
  timesheetEligibility: string;
  invitationSent: boolean;
}

export type ActivationOutcome =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "activated"; result: ActivationResult }
  | { status: "invite_sent"; email: string; emailSent: boolean }
  | { status: "error"; message: string };

interface Step7ActivationProps {
  employee: Employee;
  onActivated: () => void;
}

export function Step7Activation({ employee, onActivated }: Step7ActivationProps) {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canManage = hasPermission(role, "onboarding.manage");
  const { addToast } = useToast();

  const [outcome, setOutcome] = useState<ActivationOutcome>({ status: "idle" });
  const [inviting, setInviting] = useState(false);

  const isActivated = employee.employmentStatus === "ACTIVE";
  const eligibilityLabel = employee.timesheetEligibility?.replace(/_/g, " ");

  const handleActivate = async () => {
    setOutcome({ status: "activating" });
    try {
      const result = await activateOnboarding(employee.id);
      setOutcome({
        status: "activated",
        result: {
          employeeId: result.employeeId,
          employmentStatus: result.employmentStatus,
          timesheetEligibility: result.timesheetEligibility,
          invitationSent: result.invitationSent,
        },
      });
      onActivated();
      addToast("success", `${employee.firstName} ${employee.lastName} activated — ${result.timesheetEligibility}`);
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Failed to activate employee. Please check that onboarding is approved and try again.";
      setOutcome({ status: "error", message: msg });
      addToast("error", "Activation failed: " + msg);
    }
  };

  const handleSendInvite = async () => {
    setInviting(true);
    try {
      const result = await sendOnboardingInvite(employee.id);
      setOutcome({ status: "invite_sent", email: result.email, emailSent: result.emailSent });
      addToast(
        result.emailSent ? "success" : "warning",
        result.emailSent
          ? `Invitation sent to ${result.email}.`
          : `Email delivery failed. Share the link manually.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send invitation.";
      setOutcome({ status: "error", message: msg });
      addToast("error", "Invite failed: " + msg);
    } finally {
      setInviting(false);
    }
  };

  const inviteLink = `${window.location.origin}/login?invite=${employee.id}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs text-gray-500">Current Status</p>
          <p className="text-sm font-medium text-gray-900">{employee.employmentStatus.replace(/_/g, " ")}</p>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <p className="text-xs text-gray-500">Timesheet Eligibility</p>
          <p className="text-sm font-medium text-gray-900">{eligibilityLabel ?? "—"}</p>
        </div>
      </div>

      {!isActivated && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Clock size={14} className="inline mr-1" />
          Employee is not yet activated. Click "Activate Employee" to set them to ACTIVE.
        </div>
      )}

      {outcome.status === "activated" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
          <CheckCircle size={16} className="inline mr-1" />
          <span className="font-medium">Employee activated successfully!</span>
          <div className="mt-1 text-xs">
            Employment Status: <strong>{outcome.result.employmentStatus}</strong> ·{" "}
            Timesheet: <strong>{outcome.result.timesheetEligibility}</strong>
          </div>
          {!outcome.result.invitationSent && (
            <div className="mt-2 text-xs">
              No invitation sent yet. You can send one below.
            </div>
          )}
        </div>
      )}

      {outcome.status === "invite_sent" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle size={16} className="inline mr-1" />
          {outcome.emailSent
            ? `Invitation sent to ${outcome.email}.`
            : `Invitation link generated but email delivery failed. Share this link manually:`}
          {!outcome.emailSent && (
            <div className="mt-1 flex items-center gap-2">
              <code className="text-xs bg-white px-2 py-1 rounded border border-green-200 break-all">
                {inviteLink}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="text-xs underline"
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          )}
        </div>
      )}

      {outcome.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {outcome.message}
        </div>
      )}

      <div className="space-y-2">
        {!isActivated &&
          (outcome.status === "idle" ||
            outcome.status === "error" ||
            outcome.status === "activating") && (
          <Button
            onClick={handleActivate}
            disabled={!canManage || outcome.status === "activating" || isActivated}
            size="sm"
            data-step-activate="true"
          >
            {outcome.status === "activating" ? "Activating..." : "Activate Employee"}
          </Button>
        )}

        {outcome.status === "activated" && (
          <Button
            onClick={handleSendInvite}
            disabled={!canManage || inviting}
            size="sm"
          >
            {inviting ? "Sending..." : <><Send size={14} /> Send Invitation</>}
          </Button>
        )}

        {(outcome.status === "activated" || outcome.status === "invite_sent") && (
          <Button
            variant="ghost"
            onClick={handleSendInvite}
            disabled={!canManage || inviting}
            size="sm"
          >
            Resend Invitation
          </Button>
        )}
      </div>
    </div>
  );
}
