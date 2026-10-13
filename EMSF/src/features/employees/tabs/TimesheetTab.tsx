import type { Employee } from "../../../types";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function TimesheetTab({ employee }: { employee: Employee }) {
  const states = [
    "NOT_ELIGIBLE",
    "ELIGIBLE",
    "PENDING_PROVISIONING",
    "PROVISIONED",
    "PROVISIONING_FAILED",
  ];
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Timesheet Integration</h3>
      <p className="text-xs text-gray-500 mb-4">
        Read-only status from the EMS side. The Timesheet platform is a separate application.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">Eligibility</dt>
          <dd className="mt-1">
            <StatusBadge status={employee.timesheetEligibility} />
          </dd>
        </div>
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">Provisioning</dt>
          <dd className="mt-1">
            <StatusBadge status={employee.timesheetEligibility} />
          </dd>
        </div>
      </dl>
      <div className="rounded-md bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600">
        <p className="font-medium text-gray-900 mb-1">Business rules</p>
        <p>ACTIVE + BILLABLE = TIMESHEET ELIGIBLE.</p>
        <p>NON-BILLABLE = NOT AUTOMATICALLY PROVISIONED.</p>
        <p className="mt-2">Possible states: {states.join(" / ")}.</p>
      </div>
    </div>
  );
}
