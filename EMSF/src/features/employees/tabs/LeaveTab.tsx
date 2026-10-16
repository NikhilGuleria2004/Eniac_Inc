import { Link } from "react-router-dom";
import type { Employee } from "../../../types";
import { getEmployees, getLeaveRequestsByEmployee } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { ROUTES } from "../../../data/constants";
import {
  getLeaveBalances,
  LEAVE_QUOTAS,
  LEAVE_TYPE_LABELS,
  type LeaveType,
} from "../../leave/leave";

/** §33 Leave Tab: balance cards, Request button, history with Approved By. */
export function LeaveTab({ employee }: { employee: Employee }) {
  const leaves = getLeaveRequestsByEmployee(employee.id);
  const balances = getLeaveBalances(employee.id, leaves);
  const types = Object.keys(LEAVE_QUOTAS) as LeaveType[];
  const approverMap = new Map(
    getEmployees().map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
  );

  return (
    <div className="space-y-4">
      {/* §33 balance cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Leave Balance</h3>
          <Link to={ROUTES.LEAVE_REQUEST} className="btn btn-primary btn-sm">
            Request Leave
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {types.map((type) => (
            <div key={type} className="rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {LEAVE_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {balances[type].remaining}
                <span className="text-sm font-normal text-gray-400"> / {balances[type].total}</span>
              </p>
              <p className="text-xs text-gray-500">{balances[type].used} used</p>
            </div>
          ))}
        </div>
      </div>

      {/* §33 history table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          History ({leaves.length})
        </h3>
        {leaves.length === 0 ? (
          <p className="text-sm text-gray-500">No leave requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Start</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">End</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Days</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Reason</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Approved By</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{LEAVE_TYPE_LABELS[l.type]}</td>
                    <td className="py-2 px-3 text-gray-600">{l.startDate}</td>
                    <td className="py-2 px-3 text-gray-600">{l.endDate}</td>
                    <td className="py-2 px-3 text-gray-600">{l.days}</td>
                    <td className="py-2 px-3 text-gray-600">{l.reason}</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {l.approvedBy ? approverMap.get(l.approvedBy) ?? l.approvedBy : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
