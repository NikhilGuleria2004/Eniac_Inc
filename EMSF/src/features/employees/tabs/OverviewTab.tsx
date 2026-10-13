import type { Employee } from "../../../types";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function OverviewTab({ employee }: { employee: Employee }) {
  const eligible = employee.timesheetEligibility === "ELIGIBLE" || employee.timesheetEligibility === "PROVISIONED";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Full Name</dt>
            <dd className="text-gray-900 font-medium">
              {employee.firstName} {employee.lastName}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{employee.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900">{employee.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Location</dt>
            <dd className="text-gray-900">
              {employee.city}, {employee.country}
            </dd>
          </div>
        </dl>
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Employment Summary</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Employee Code</dt>
            <dd className="text-gray-900 font-medium">{employee.employeeCode}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Status</dt>
            <dd>
              <StatusBadge status={employee.employmentStatus} />
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Billing</dt>
            <dd>
              <StatusBadge status={employee.billingStatus} />
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Timesheet</dt>
            <dd>
              <StatusBadge status={employee.timesheetEligibility} />
            </dd>
          </div>
        </dl>
        <div
          className={
            "mt-4 rounded-md border px-3 py-2 text-xs " +
            (eligible
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-gray-200 bg-gray-50 text-gray-600")
          }
        >
          {eligible
                ? "Timesheet eligible — provisioned to the Timesheet platform."
                : "Not timesheet eligible. Only ACTIVE + BILLABLE employees are auto-provisioned."}
        </div>
      </div>
    </div>
  );
}
