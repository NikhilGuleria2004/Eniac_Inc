import { DataTable } from "../../../components/tables/DataTable";
import { getEmployees } from "../../../data/mock/repositories";
import { getLeaveBalances, LEAVE_QUOTAS, LEAVE_TYPE_LABELS, type LeaveType } from "../leave";
import type { LeaveRequest } from "../../../types";

/** Per-employee leave balance table: quota / used / remaining per leave type. */
export function BalancesTab({ requests }: { requests: LeaveRequest[] }) {
  const employees = getEmployees();

  return (
    <DataTable
      data={employees}
      keyExtractor={(e) => e.id}
      columns={[
        {
          key: "employee",
          header: "Employee",
          sortable: true,
          cell: (e) => (
            <span className="font-medium text-gray-900">
              {e.firstName} {e.lastName}
            </span>
          ),
        },
        ...(Object.keys(LEAVE_QUOTAS) as LeaveType[]).map((type) => ({
          key: type,
          header: LEAVE_TYPE_LABELS[type],
          sortable: true,
          cell: (e: (typeof employees)[number]) => {
            const b = getLeaveBalances(e.id, requests)[type];
            return (
              <span className="text-sm">
                {b.remaining} <span className="text-gray-400">/ {b.total}</span>
                <span className="text-gray-400"> ({b.used} used)</span>
              </span>
            );
          },
        })),
        {
          key: "totalRemaining",
          header: "Total Remaining",
          sortable: true,
          cell: (e) => {
            const b = getLeaveBalances(e.id, requests);
            const total = (Object.keys(b) as LeaveType[]).reduce(
              (s, t) => s + b[t].remaining,
              0,
            );
            return <span className="font-medium text-gray-900">{total} days</span>;
          },
        },
      ]}
      emptyState={{
        title: "No employees",
        description: "Add employees to see their leave balances.",
      }}
    />
  );
}